# Setup B.A.T.M.A.N. Mesh Networking

## Credits

This is abstracted for this device from:

* [OpenWRT B.A.T.M.A.N. / batman-adv](https://openwrt.org/docs/guide-user/network/wifi/mesh/batman)
* [Mesh networking: A guide to using free and open-source software with common
hardware](https://cgomesu.com/blog/Mesh-networking-openwrt-batman/)
* [Simple (BATMAN) Mesh Network Setup](https://forum.openwrt.org/t/simple-batman-mesh-network-setup/49098/9)

## Notes

This assumes you are familiar with Linux and can get around a
basic file system.

I'm using my 802.11a/b/g/n radio for the mesh network
`phy0` / `radio0`, you can view your radios and their
capabilities with the `iw list` command.  My mesh network
will be setup in the 2.4Ghz space for this guide.

In a couple places I put `reboot & exit`.  I do this, because
just doing `reboot` will sometimes get you stuck in the shell.

My network is named after Ghostbusters franchise all of the
devices in this guide are as such, you may name yours whatever
you like.

## Version

**These instructions are based on OpenWRT 23.05.3.**

![OpenWRT 23.05.3](https://raw.githubusercontent.com/pjobson/aerohive_hiveap-330/main/IMG/OpenWRT-23.05.3.png)

If you have a newer version, you'll have to update the package
paths and possibly version numbers.

## Network Diagram

![Network Diagram](https://raw.githubusercontent.com/pjobson/aerohive_hiveap-330/main/IMG/network_diagram.png)

## .ssh config

You may want to add host entries in your machine's `~/.ssh/config`,

I also have this entry for 192.168.1.1 so ssh doesn't save it in
my `known_hosts` file.

    host 192.168.1.1
        User root
        StrictHostKeyChecking=no
        UserKnownHostsFile=/dev/null

    host gozer-node0
        hostname 10.10.10.10
        User root

    host 10.10.10.10
        User root

    host gozer-node1
        hostname 10.10.10.11
        User root

    host 10.10.10.11
        User root

    host gozer-node2
        hostname 10.10.10.12
        User root

    host 10.10.10.12
        User root

Add additional ones for your particular case.

## Router Default IP

The router's default IP address is 192.168.1.1 you can reach it
via SSH or LuCi.

    ssh 192.168.1.1

## Set LAN Static IP

Edit `/etc/config/network`.

Modify your `lan` interface:

    config interface 'lan'
        option device 'br-lan'
        option ifname 'eth0 bat0'
        option proto 'static'
        option ip6assign '60'
        option ipaddr '10.10.10.10'    # .10, .11, .12, etc
        option netmask '255.255.255.0'
        option gateway '10.10.10.1'    # primary router
        list dns '10.10.10.1'          # primary router or DNS

You'll want to reload your network here.

    service network reload & exit

On your host you'll temporarily need to set your network interface
to Manual.

* Address: 10.10.10.222 (any unique IP on your network)
* Netmask: 255.255.255.0
* Gateway: 10.10.10.10 (your node's IP address)

I'll be using 10.10.10.10 for examples in this document from
here on.

## Download Packages and Push to Router

On your host machine.

Get Packages:

    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/routing/batctl-full_2023.1-2_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/luci/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/librt_1.2.4-4_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk

Upload Packages:

    scp *.ipk 10.10.10.10:/tmp/

## Remove & Install Packages

SSH back into your router.

### Uninstall Conflicting Packages

    opkg remove wpad-basic wpad-basic-wolfssl wpad-basic-mbedtls

### Install B.A.T.M.A.N. Packages

    opkg install \
        /tmp/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk \
        /tmp/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk \
        /tmp/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk \
        /tmp/batctl-full_2023.1-2_powerpc_8548.ipk \
        /tmp/librt_1.2.4-4_powerpc_8548.ipk

### Install SSL Packages

    opkg install \
        /tmp/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk \
        /tmp/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk

## Configuration

The **valid interface combinations** for this device are as follows.
~~I'm fairly sure you can only install B.A.T.M.A.N. on devices with
IBSS.~~

    iw phy | fgrep mesh

    # { managed } <= 2048, #{ AP, mesh point } <= 8, #{ P2P-client, P2P-GO } <= 1, #{ IBSS } <= 1,
    total <= 2048, #channels <= 1, STA/AP BI must match, radar detect widths: { 20 MHz (no HT), 20 MHz, 40 MHz }

### ath9k Module

To enable mesh encryption, which you will want you will need to
add the `nohwcrypt` flag to the ath9k modules file.

Replace `/etc/modules.d/ath9k` vi `echo`:

    echo "ath9k nohwcrypt=1" > /etc/modules.d/ath9k

Save and reboot.

    reboot & exit

SSH back into the router.

    cat /sys/module/ath9k/parameters/nohwcrypt

This should return `1`.

### Add Your SSH Keys

From your host machine.

    cat ~/.ssh/id_rsa.pub | ssh root@10.10.10.10 "cat >> /etc/dropbear/authorized_keys"

### BAT Hosts

You'll want to keep a list of all of your nodes with their
MAC addresses, this can be stored in `/etc/bat-hosts` on
each of the nodes.

For example:

    88:DC:96:06:09:D0 gozer-node0
    88:DC:96:06:09:4B gozer-node1
    88:DC:96:06:07:EA gozer-node2

I also keep a list of nodes with their information.

| MESH NAME  | NODE NAME    | LAN IP      | MAC ADDRESS       |
| ---------- | ------------ | ----------- | ----------------- |
| gozer_mesh | gozer-node0  | 10.10.10.10 | 88:DC:96:06:09:D0 |
| gozer_mesh | gozer-node1  | 10.10.10.11 | 88:DC:96:06:09:4B |
| gozer_mesh | gozer-node2  | 10.10.10.12 | 88:DC:96:06:07:EA |

### Add Hostname/Nodename

Edit your `/etc/config/system` file, under `config system` set
your `hostname`, for example:

    option hostname 'gozer-node0'

### Set Router Password

    passwd

### Remove Existing Wifi Interfaces

Edit `/etc/config/wireless` and remove all `wifi-iface`
configurations, by default there are two with OpenWRT as
the SSID on radio0 and radio1.

Then reload networking.

    service network reload

It should return:

    'radio0' is disabled
    'radio1' is disabled
    'radio0' is disabled
    'radio1' is disabled

### Update Your Network

Edit `/etc/config/network`.

Add `bat0` & `mesh` interfaces:

    config interface 'bat0'
        option proto 'batadv'
        option routing_algo 'BATMAN_V'
        option aggregated_ogms '1'
        option bridge_loop_avoidance '1'
        option gw_mode 'client'
        option hop_penalty '30'
        option isolation_mark '0x00000000/0x00000000'
        option log_level '0'
        option multicast_fanout '16'
        option network_coding '0'
        option orig_interval '1000'
        list dns '10.10.10.1'

    config interface 'mesh0'
        option proto  'batadv_hardif'
        option master 'bat0'
        option mtu    '1536'

### Modify Wireless

Edit `/etc/config/wireless`, change `radio0` to:

    config wifi-device 'radio0'
        option type 'mac80211'
        option path '<YOUR_PCIE_PATH_DO_NOT_CHANGE>'
        option channel '5' # this can be any valid channel for your region
        option band '2g'
        option cell_density '0'

Then add:

    config wifi-iface 'wifimesh'      # One word all letters/numbers
        option device 'radio0'        # wifi-device to use
        option ifname 'radio0_mesh'   # custom interface name
        option network 'mesh'         # name of the network interface
        option mode 'mesh'            # name of the interface in /etc/config/network
        option mesh_id 'GOZER-MESH'   # ssid of your mesh network
        option encryption 'sae'       # encryption type - https://openwrt.org/docs/guide-user/network/wifi/basic#encryption_modes
        option key 'MeshPassword123'  # mesh password
        option mesh_fwding '0'        # let batman-adv handle routing
        option mesh_ttl '1'           # time to live in the mesh
        option mcast_rate '24000'     # routes with a lower throughput rate won't be visible
        option disabled '0'           # change to 1 to disable it
        option network 'mesh0'        # name of the network interface

Save and exit.

#### radio1 Note

If you want to use `radio1` for your mesh network 5g instead of the 2g you
can use this configuration instead of the one above.  I'm not sure if you
can use both configurations or not, I have not tested that.

    config wifi-device 'radio1'
        option type 'mac80211'
        option path 'ffe0a000.pcie/pcia000:02/a000:02:00.0/a000:03:00.0'
        option channel '40'
        option band '5g'
        option htmode 'HT20'
        option cell_density '0'

    config wifi-iface 'wifimesh'
        option device 'radio1'
        option ifname 'radio1_mesh'
        option network 'mesh0'
        option mode 'mesh'
        option mesh_id 'GOZER-MESH'
        option encryption 'sae'
        option key 'MeshPassword123'
        option mesh_fwding '0'
        option mesh_ttl '1'
        option mcast_rate '24000'
        option disabled '0'

### Optional: Disable Authorative DHCP

If your DHCP is managed on a primary router or elsewhere in your network, you
do not need it enabled on your MESH devices.

Edit `/etc/config/dhcp`, fine `odhcpd` and change `maindhcp` to `0`.

    config odhcpd 'odhcpd'
            option maindhcp '0'
            option leasefile '/tmp/hosts/odhcpd'
            option leasetrigger '/usr/sbin/odhcpd-update'
            option loglevel '4'

Save and exit.

### Reboot & Verify

Reboot & verify link.

    reboot & exit

Check the link

    ip link | grep bat

Should return:

    7: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN qlen 1000
    8: radio0_mesh: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1536 qdisc noqueue master bat0 state UP qlen 1000

Check for active.

    batctl if

This should return each of the following:

    radio0_mesh: active

### Bridge LAN and Mesh

Edit your `/etc/config/network`, find your `br-lan` device and
change it to:

    config device
        option name 'br-lan'
        option type 'bridge'
        list ports 'bat0'
        list ports 'eth1'

Reload networking.

    service network reload

At this point nothing will happen, but after we are done we should
be able to get IP addresses through the mesh network to whatever
is connected to it.

### Allow Connection (LuCi/SSH) to WAN (Optional)

**Note:** Only add this if you're using these devices inside a
private network.

Edit `/etc/config/firewall`, add:

    config rule
        option name 'Allow-Admin-Wan'
        option src 'wan'
        option dest_port '22 80 443'
        option target 'ACCEPT'
        option enabled 'true'
        list proto 'tcp'

Reload the firewall.

    service firewall reload

### Backup Configuration

From your host machine, backup some of the configuration files.

    mkdir aero_etc
    scp 10.10.10.10:/etc/config/ ./aero_etc/config
    scp 10.10.10.10:/etc/bat-hosts ./aero_etc/
    scp 10.10.10.10:/etc/dropbear/authorized_keys ./aero_etc/

You can download your shadow file if you want to use the same
password across all nodes.

    scp 10.10.10.10:/etc/shadow ./aero_etc/shadow

### Reboot

At this point, you may as well reboot the router.

    reboot & exit

## Quick Install On Additional Router/Nodes

You can now quickly configure additional routers with the following.

Change your host's ethernet setting to DHCP again.

    # push all the packages to /tmp
    scp *.ipk 192.168.1.1:/tmp/

    # remove unneeded packages
    # this runs a command over ssh, so you don't need to login
    ssh 192.168.1.1 "opkg remove wpad-basic wpad-basic-wolfssl wpad-basic-mbedtls"

    # install batman
    ssh 192.168.1.1 "opkg install \
      /tmp/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk \
      /tmp/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk \
      /tmp/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk \
      /tmp/batctl-full_2023.1-2_powerpc_8548.ipk \
      /tmp/librt_1.2.4-4_powerpc_8548.ipk"

    # install ssl
    ssh 192.168.1.1 "opkg install \
      /tmp/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk \
      /tmp/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk"

    # modify ath9k module
    ssh 192.168.1.1 "echo 'ath9k nohwcrypt=1' > /etc/modules.d/ath9k"

    # Copy over config files
    scp -r ./aero_etc/config/*        192.168.1.1:/etc/config/
    scp    ./aero_etc/authorized_keys 192.168.1.1:/etc/dropbear/
    scp    ./aero_etc/bat-hosts       192.168.1.1:/etc/

    # modify the node's IP address
    # CHANGE XXX to whatever your next IP is
    # If you leave it XXX you will need to fix it via the
    # CONSOLE CABLE
    ssh 192.168.1.1 "sed -i "s/'10.10.10.10'/'10.10.10.XXX'/" /etc/config/network"

    # Change the node's hostname
    # CHANGE YYY to whatever your next node number is.
    ssh 192.168.1.1 "sed -i "s/'gozer-node0'/'gozer-nodeYYY'/" /etc/config/system"

    # optional restore your shadow file to update the password
    scp    ./aero_etc/shadow   192.168.1.1:/etc/

    # reboot the router
    ssh 192.168.1.1 "reboot"

You will need to change your network settings back to manual.

## Testing

    ssh 10.10.10.XXX "ip link | grep bat"

    # should return
    # 7: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master br-lan state UNKNOWN qlen 1000
    # 8: radio0_mesh: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1536 qdisc noqueue master bat0 state UP qlen 1000

    ssh 10.10.10.XXX "batctl if"

    # should return
    # radio0_mesh: active

    ssh 10.10.10.XXX "batctl n"

    # This should return the neighbor nodes
    # The more you add the more you'll see.
    # [B.A.T.M.A.N. adv 2023.1-openwrt-6, MainIF/MAC: radio0_mesh/88:dc:96:06:07:ea (bat0/fe:0f:f2:9d:2c:55 BATMAN_V)]
    # IF             Neighbor              last-seen
    #       gozer-node0    0.040s (       41.0) [radio0_mesh]
    #       gozer-node1    0.100s (       30.6) [radio0_mesh]

## Configure Mesh Gateway

From here we're going to create a bridge from a primary router
to provide internet to the 0th node.  This should allow you to
get IP addresses from the primary's DHCP server and get internet
access through your mesh network.

Set your host machine's network back to DHCP and plug an ethernet
cable between your primary router's LAN and ETH0.

### Configure `br-lan`

Edit `/etc/config/network` and modify your `br-lan` device.

    config device
        option name 'br-lan'
        option type 'bridge'
        list ports 'bat0'
        list ports 'eth0'
        list ports 'eth1'

Then reload networking.

    service network reload

At this point check your host machine, you should have an IP
address using your primary router as your gateway.

    ping -c3 google.com

From here you should be able to connect an ethernet cable to any
of your nodes and get a DHCP IP address from your primary router.

## Optional: Add Wifi Network

You can add an additional 5g wifi network to each of these routers
if you want to.  For example:

    # optionally change your wifi channel in your radio1 device
    config wifi-device 'radio1'
        option type 'mac80211'
        option path 'ffe0a000.pcie/pcia000:02/a000:02:00.0/a000:03:00.0'
        option channel '36'
        option band '5g'
        option htmode 'HT20'
        option cell_density '0'

    config wifi-iface 'wifinet2'
        option device 'radio1'
        option mode 'ap'
        option ssid 'ZUUL-AN'
        option encryption 'psk-mixed'
        option key 'YOUR_PASSWORD'
        option network 'lan'

Reload your network.

    service network reload

As long as you put the network as `lan` it should give DHCP from
your primary router.
