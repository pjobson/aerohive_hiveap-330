# Setup B.A.T.M.A.N. Mesh Networking

## Notes & Credit

**This is a work in progress.**

This is abstracted for this device from [Mesh networking: A guide to using free and open-source software with common hardware](https://cgomesu.com/blog/Mesh-networking-openwrt-batman/).

I upload the IPK files directly to the router and install them
as such instead of connecting the device to the internet first.

I'm using my 802.11a/b/g/n radio for the mesh network
`phy0` / `radio0`, you can view your radios and their
capabilities with the `iw list` command.  My mesh network
will be setup in the 2.4Ghz space for this guide.

## .ssh config

Add the following entry to your `~/.ssh/config`, this sets the
default user to root, disables key checking, and ignores the
hosts file.

    host 192.168.1.1
        User root
        StrictHostKeyChecking=no
        UserKnownHostsFile=/dev/null

## Download Packages and Push to Router

From your host machine.

Get Packages:

    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/routing/batctl-full_2023.1-2_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/luci/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/librt_1.2.4-4_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk

Upload Packages:

    scp *.ipk 192.168.1.1:/tmp/

## Install B.A.T.M.A.N. Packages

    opkg install \
        /tmp/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk \
        /tmp/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk \
        /tmp/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk \
        /tmp/batctl-full_2023.1-2_powerpc_8548.ipk \
        /tmp/librt_1.2.4-4_powerpc_8548.ipk

## Install SSL Packages

    opkg remove wpad-basic wpad-basic-wolfssl wpad-basic-mbedtls

    opkg install \
        /tmp/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk \
        /tmp/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk

## Configuration

The **valid interface combinations:** for this device are, I'm fairly
sure you can only install B.A.T.M.A.N. on devices with IBSS.

    # { managed } <= 2048, #{ AP, mesh point } <= 8, #{ P2P-client, P2P-GO } <= 1, #{ IBSS } <= 1,
    total <= 2048, #channels <= 1, STA/AP BI must match, radar detect widths: { 20 MHz (no HT), 20 MHz, 40 MHz }

### ath9k Module

To enable mesh encryption, which you will want you will need to
add the `nohwcrypt` flag to the ath9k modules file.

Edit `/etc/modules.d/ath9k` setting it to:

    ath9k nohwcrypt=1

Save and reboot.

    cat /sys/module/ath9k/parameters/nohwcrypt

This should return `1`.

### Remove Existing Wifi Interfaces

Edit `/etc/config/wireless` and remove all `wifi-iface`
configurations, by default there are two with OpenWRT as
the SSID on radio0 and radio1.

Then reload networking.

    service network reload

### Add Mesh WiFi Interface

Edit `/etc/config/wireless`, change `radio1` to:

    config wifi-device 'radio0'
        option type 'mac80211'
        option path '<YOUR_PCIE_PATH_DO_NOT_CHANGE>'
        option channel '5'
        option band '2g'
        option cell_density '0'

Then add:

    config wifi-iface 'wmesh'
        option device 'radio0'        # wifi-device to use
        option network 'mesh'         # name of the network
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

Add `bat0` interface:

    config interface 'bat0'
        option proto 'batadv'
        option routing_algo 'BATMAN_IV'
        option aggregated_ogms '1'
        option ap_isolation '0'
        option bonding '0'
        option bridge_loop_avoidance '1'
        option distributed_arp_table '1'
        option fragmentation '1'
        option gw_mode 'off'
        option hop_penalty '30'
        option isolation_mark '0x00000000/0x00000000'
        option log_level '0'
        option multicast_mode '1'
        option multicast_fanout '16'
        option network_coding '0'
        option orig_interval '1000'

Add `mesh` interface:

    config interface 'mesh'
        option proto  'batadv_hardif'
        option master 'bat0'
        option mtu    '1536'

Save and exit.

Reboot & verify link.

    reboot && exit

    ip link | grep bat0
    batctl if

This should return each of the following:

    11: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN qlen 1000
    phy1-mesh0: active

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

    scp 192.168.1.1:/etc/config/ ./config

### Quick Install On Other Routers

You can now quickly configure additional routers with:

    scp *.ipk 192.168.1.1:/tmp/

    ssh 192.168.1.1 "opkg remove wpad-basic wpad-basic-wolfssl wpad-basic-mbedtls"

    ssh 192.168.1.1 "opkg install \
          /tmp/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk \
          /tmp/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk \
          /tmp/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk \
          /tmp/batctl-full_2023.1-2_powerpc_8548.ipk \
          /tmp/librt_1.2.4-4_powerpc_8548.ipk"

    ssh 192.168.1.1 "opkg install \
        /tmp/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk \
        /tmp/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk"

    scp -r ./config/* 192.168.1.1:/etc/config/

    ssh 192.168.1.1 "echo 'ath9k nohwcrypt=1' > /etc/modules.d/ath9k"

    ssh 192.168.1.1 "reboot"

    ssh 192.168.1.1 "ip link | grep bat0"

    # should return
    # 7: bat0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UNKNOWN qlen 1000
    # 8: phy0-mesh0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1536 qdisc noqueue master bat0 state UP qlen 1000

    ssh 192.168.1.1 "batctl if"

    # should return
    # phy0-mesh0: active

## Test Mesh Network

This should show the current mesh host with its neighbor mesh
hosts.

    ssh 192.168.1.1 "batctl n"

should return something like

    # [B.A.T.M.A.N. adv 2023.1-openwrt-6, MainIF/MAC: phy0-mesh0/88:dc:96:06:09:d0 (bat0/46:c1:f3:cc:74:d1 BATMAN_IV)]
    # IF             Neighbor              last-seen
    # phy0-mesh0     88:dc:96:06:09:4b     0.140s

