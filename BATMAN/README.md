# Setup B.A.T.M.A.N. Mesh Networking

## Credits

This is abstracted for this device from [Mesh networking: A guide
to using free and open-source software with common
hardware](https://cgomesu.com/blog/Mesh-networking-openwrt-batman/).

## Notes

This assumes you are familiar with Linux and can get around a
basic file system.

I'm using my 802.11a/b/g/n radio for the mesh network
`phy0` / `radio0`, you can view your radios and their
capabilities with the `iw list` command.  My mesh network
will be setup in the 2.4Ghz space for this guide.

In a couple places I put `reboot & exit`.  I do this, because
just doing `reboot` will sometimes get you stuck in the shell.

## Version

**These instructions are based on OpenWRT 23.05.3.**

If you have a newer version, you'll have to update the package
paths and possibly version numbers.

## .ssh config

You may want to add host entries in your machine's `~/.ssh/config`,
I also have this entry for 192.168.1.1 so ssh doesn't add it to
the main Hosts File.

    host 192.168.1.1
        User root
        StrictHostKeyChecking=no
        UserKnownHostsFile=/dev/null

    host my-mesh0
        hostname 10.10.10.11
        User root

    host 10.10.10.11
        User root

    host my-mesh1
        hostname 10.10.10.12
        User root

    host 10.10.10.12
        User root

    host my-mesh2
        hostname 10.10.10.13
        User root

    host 10.10.10.13
        User root

## Router Default IP

The router's default IP address is 192.168.1.1 you can reach it
via SSH or LuCi.

## Set LAN Static IP

Edit `/etc/config/network`.

Modify your `lan` interface:

    config interface 'lan'
        option device 'br-lan'
        option proto 'static'
        option ipaddr '<YOUR_NODES_IP>'
        option netmask '255.255.255.0'
        option ip6assign '60'
        option gateway '<YOUR_PRIMARY_ROUTER>'
        list dns '<YOUR_DNS_SERVER>'

You'll want to reload your network here.

    service network reload & exit

On your host you'll temporarily need to set your network interface
to Manual.

* Address: 10.10.10.222 (any unique IP on your network)
* Netmask: 255.255.255.0
* Gateway: 10.10.10.11 (your node's IP address)

I'll be using 10.10.10.11 for examples in this document from
here on.

## Disable DHCP on LAN

We're going to get DHCP from a primary router, so you'll need to
disable it in your nodes.

Edit `/etc/config/dhcp`.

Find your `dnsmasq` config and change it to:

    config dnsmasq
        option domainneeded '1'
        option localise_queries '1'
        option rebind_protection '1'
        option rebind_localhost '1'
        option local '/lan/'
        option domain 'lan'

Find your `lan` interface and change it to:

    config dhcp 'lan'
        option interface 'lan'
        option start '100'
        option limit '150'
        option leasetime '12h'
        option dhcpv4 'server'
        option ignore '1'
        option dynamicdhcp '0'

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

    scp *.ipk 10.10.10.11:/tmp/

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

The **valid interface combinations:** for this device are, I'm
fairly sure you can only install B.A.T.M.A.N. on devices with
IBSS.

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

    cat ~/.ssh/id_rsa.pub | ssh root@10.10.10.11 "cat >> /etc/dropbear/authorized_keys"

### BAT Hosts

First you'll want to keep a list of all of your nodes with their
MAC addresses, this should be stored in `/etc/bat-hosts` on
each of the nodes.  For example:

    88:DC:96:06:09:D0 my-mesh0
    88:DC:96:06:09:4B my-mesh1
    88:DC:96:06:07:EA my-mesh2

I also keep a list of nodes with their information.

| MESH NAME  | NODE NAME | LAN IP      | MAC ADDRESS       |
| ---------- | --------- | ----------- | ----------------- |
| phy0-mesh0 | my-mesh0  | 10.10.10.11 | 88:DC:96:06:09:D0 |
| phy0-mesh0 | my-mesh1  | 10.10.10.12 | 88:DC:96:06:09:4B |
| phy0-mesh0 | my-mesh2  | 10.10.10.13 | 88:DC:96:06:07:EA |

### Add Hostname/Nodename

Edit your `/etc/config/system` file, under `config system` set
your `hostname`, for example:

    option hostname 'my-mesh0'

### Set Router Password

    passwd

### Remove Existing Wifi Interfaces

Edit `/etc/config/wireless` and remove all `wifi-iface`
configurations, by default there are two with OpenWRT as
the SSID on radio0 and radio1.

Then reload networking.

    service network reload

It may return:

    'radio0' is disabled
    'radio1' is disabled
    'radio0' is disabled
    'radio1' is disabled

### Add Mesh WiFi Interface

Edit `/etc/config/wireless`, change `radio0` to:

    config wifi-device 'radio0'
        option type 'mac80211'
        option path '<YOUR_PCIE_PATH_DO_NOT_CHANGE>'
        option channel '5'
        option band '2g'
        option cell_density '0'

Then add:

    config wifi-iface 'wmesh'
        option device 'radio0'        # wifi-device to use
        option network 'mesh'         # name of the network interface
        option mode 'mesh'            # name of the interface in /etc/config/network
        option mesh_id 'MeshCloud'    # ssid of your mesh network
        option encryption 'sae'       # encryption type - https://openwrt.org/docs/guide-user/network/wifi/basic#encryption_modes
        option key 'MeshPassword123'  # mesh password
        option mesh_fwding '0'        # let batman-adv handle routing
        option mesh_ttl '1'           # time to live in the mesh
        option mcast_rate '24000'     # routes with a lower throughput rate won't be visible
        option disabled '0'           # change to 1 to disable it

Save and exit.

### Add Interfaces to Network

Edit `/etc/config/network`.

Add `bat0` & `mesh` interfaces:

    config interface 'bat0'
        option proto 'batadv'
        option routing_algo 'BATMAN_IV'
        option aggregated_ogms '1'
        option bridge_loop_avoidance '1'
        option gw_mode 'client'
        option hop_penalty '30'
        option isolation_mark '0x00000000/0x00000000'
        option log_level '0'
        option multicast_fanout '16'
        option network_coding '0'
        option orig_interval '1000'
        list dns '<YOUR_DNS_SERVER>'

    config interface 'mesh'
        option proto  'batadv_hardif'
        option master 'bat0'
        option mtu    '1536'

Save and exit.

Reboot & verify link.

    reboot & exit

Check the link

    ip link | grep bat0

Should return:

    7: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN qlen 1000
    8: phy0-mesh0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1536 qdisc noqueue master bat0 state UP qlen 1000

Check for active.

    batctl if

This should return each of the following:

    phy1-mesh0: active

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
    scp 10.10.10.11:/etc/config/ ./aero_etc/config
    scp 10.10.10.11:/etc/bat-hosts ./aero_etc/
    scp 10.10.10.11:/etc/dropbear/authorized_keys ./aero_etc/

You can download your shadow file if you want to use the same
password across all nodes.

    scp 10.10.10.11:/etc/shadow ./aero_etc/shadow

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

    # Copy over config files
    scp -r ./aero_etc/* 192.168.1.1:/etc/

    # modify ath9k module
    ssh 192.168.1.1 "echo 'ath9k nohwcrypt=1' > /etc/modules.d/ath9k"

    # modify the node's IP address
    # CHANGE XXX to whatever your next IP is
    # If you leave it XXX you will need to fix it via the
    # CONSOLE CABLE
    ssh 192.168.1.1 "sed -i "s/'10.10.10.11'/'10.10.10.XXX'/" /etc/config/network"

    # Change the node's hostname
    # Change YYY to whatever your next node number is.
    ssh 192.168.1.1 "sed -i "s/'my-node0'/'my-nodeYYY'/" /etc/config/system"

    # reboot the router
    ssh 192.168.1.1 "reboot"

You will need to change your network settings back to manual.

## Testing

    ssh 10.10.10.XXX "ip link | grep bat0"

    # should return
    # 7: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN qlen 1000
    # 8: phy0-mesh0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1536 qdisc noqueue master bat0 state UP qlen 1000

    ssh 10.10.10.XXX "batctl if"

    # should return
    # phy0-mesh0: active

    ssh 10.10.10.XXX "batctl n"

    # This should return the neighbor nodes
    # The more you add the more you'll see.
    # [B.A.T.M.A.N. adv 2023.1-openwrt-6, MainIF/MAC: phy0-mesh0/88:dc:96:06:09:d0 (bat0/46:c1:f3:cc:74:d1 BATMAN_IV)]
    # IF             Neighbor              last-seen
    # phy0-mesh0     my-mesh0              0.140s
    # phy0-mesh0     my-mesh1              0.140s

# ---------------------------------
# UNFINISHED
# ---------------------------------

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
