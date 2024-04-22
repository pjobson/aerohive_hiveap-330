# OpenWRT Aerohive AP330

Instructions for installing OpenWRT 23.x to your AP330.

In a nutshell we will need to temporarily flash 21.02.7, then upgrade the uboot, then permanently flash 23.05.3.

You'll need a USB serial to RJ45 cable, like [this TrippLite](https://www.amazon.com/Tripp-Lite-Cisco-Serial-U209-006-RJ45-X/dp/B016A4CAF2/).

This is abstracted from [MassMesh](https://massmesh.org/wiki/index.php?title=Aerohive_AP330) and [OpenWRT](https://openwrt.org/toh/aerohive/hiveap-330) instructions, neither worked and are probably out of date.

These directions are Linux Mint centric, but can be applied to other linux distributions fairly easily.

## Links

* [WikiDevi](https://wikidevi.wi-cat.ru/Aerohive_HiveAP_330)
* [OpenWRT Techdata](https://openwrt.org/toh/hwdata/aerohive/aerohive_hiveap-330)

## Physical Device Ports

    +---------+----+------+------+
    | CONSOLE | DC | ETH1 | ETH0 |
    +---------+----+------+------+

* Console is always used for serial console.
* DC is 12VDC
* ETH1 will be the LAN port by default in OpenWRT.
* ETH0 will be the WAN port by default in OpenWRT.

## Set IP To Static

On your host machine.

Set your Ethernet adatper to:

* Type: **Static/Manual**
* Address: **192.168.1.101**
* Netmask: **0.0.0.0**
* Gateway: **192.168.1.1**

## Install gtkterm

    sudo apt install gtkterm -y

Plug-in your USB RJ45 cable to the host computer.

    dmesg

Should return something like:

    usb 2-4.1: FTDI USB Serial Device converter now attached to ttyUSB0

You'll need your `ttyUSB#`, it is most likely `ttyUSB0` and for this example I'll be using that.

Plugin the RJ45 to the **CONSOLE** port on your AP330.

Open **gtkterm**, may show as **Serial port terminal** in your menu.

Select Configuration -> Port.

* Port: `/dev/ttyUSB0`
* Baud Rate: `9600`
* Parity: `none`
* Bits: `8`
* Stopbits: `1`
* Flow Control: `none`
* OK

## Power up your AP330.

It will show some text in the terminal, when prompted to hit any key, do so:

    Hit any key to stop the autoboot process...

Then it will prompt for password, it will be `AhNf?d@ta06` or `administrator`

Leave the terminal open.

## Add ftp User

On your host machine.

    sudo mkdir /svr/ftp
    sudo addgroup --system ftp
    sudo adduser --system --home /srv/ftp --shell /usr/sbin/nologin ftp
    sudo usermod -aG ftp ftp
    sudo chown ftp:ftp /srv/ftp
    sudo chmod 777 /srv/ftp

## Install and Run uftpd

I couldn't get tftpd-hpa working for some reason, so I'm using uftpd. 

On your host machine you can install from Apt or from Source.

### From Apt

    sudo apt install uftpd

### From Source

    sudo apt install autoconf libuev-dev libuev3 libite-dev libite5
    git clone https://github.com/troglobit/uftpd.git
    cd uftpd
    ./autogen.sh
    ./configure
    make
    sudo make install

### Start It

    sudo uftpd -n -o tftp=69,ftp=23

## Get OpenWRT

On your host machine.

    cd /srv/ftp
    wget https://downloads.openwrt.org/releases/21.02.7/targets/mpc85xx/p1020/openwrt-21.02.7-mpc85xx-p1020-aerohive_hiveap-330-initramfs-kernel.bin
    wget https://downloads.openwrt.org/releases/21.02.7/targets/mpc85xx/p1020/openwrt-21.02.7-mpc85xx-p1020-aerohive_hiveap-330-squashfs-fdt.bin
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/openwrt-23.05.3-mpc85xx-p1020-aerohive_hiveap-330-squashfs-sysupgrade.bin

## Plug-In Ethernet

Plugin your ethernet cable from your Host machine's ethernet port to the AP330's **ETH1** port. 

## Temporarily Install OpenWRT 21.02.7

**NOTE:** If you already have 21.x installed, you can skip to **Update UBoot** below.

In your Serial terminal at the `=>` prompt.

    setenv serverip 192.168.1.101
    setenv ipaddr 192.168.1.1
    tftpboot 0x1000000 192.168.1.101:openwrt-21.02.7-mpc85xx-p1020-aerohive_hiveap-330-initramfs-kernel.bin
    tftpboot 0x6000000 192.168.1.101:openwrt-21.02.7-mpc85xx-p1020-aerohive_hiveap-330-squashfs-fdt.bin
    bootm 0x1000000 - 0x6000000

## Wait for OpenWRT

This will reboot into OpenWRT, it'll take about 60 seconds then pause, hit enter and it should show.

    BusyBox v1.33.2 (2023-04-17 13:15:36 UTC) built-in shell (ash)
    
      _______                     ________        __
     |       |.-----.-----.-----.|  |  |  |.----.|  |_
     |   -   ||  _  |  -__|     ||  |  |  ||   _||   _|
     |_______||   __|_____|__|__||________||__|  |____|
              |__| W I R E L E S S   F R E E D O M
     -----------------------------------------------------
     OpenWrt 21.02.7, r16847-f8282da11e
     -----------------------------------------------------
    === WARNING! =====================================
    There is no root password defined on this device!
    Use the "passwd" command to set up a new password
    in order to prevent unauthorized SSH logins.
    --------------------------------------------------
    root@OpenWrt:/#

## Set IP To DHCP

On your host machine.

Set your Ethernet adatper to:

* Type: DHCP/Automatic

You should still be using the AP330's **ETH1** port. 

This should give your host machine an IP address from the router.

## Update UBoot

From your host machine.

    ssh-keygen -f $HOME/.ssh/known_hosts -R "192.168.1.1"
    wget https://raw.githubusercontent.com/pjobson/aerohive_hiveap-330/main/bin/ubootfix.sh
    wget https://downloads.openwrt.org/releases/21.02.7/targets/mpc85xx/p1020/packages/uboot-envtools_2021.01-15_powerpc_8540.ipk
    wget https://downloads.openwrt.org/releases/21.02.7/targets/mpc85xx/p1020/kmods/5.4.238-1-be16d26ca9151e83cf596cc3cecc4e13/kmod-mtd-rw_5.4.238+git-20160214-2_powerpc_8540.ipk

    scp -O *.ipk root@192.168.1.1:/tmp/
    scp -O ubootfix.sh root@192.168.1.1:/tmp/

SSH into the router.

    ssh root@192.168.1.1
    cd /tmp
    opkg install kmod-mtd-rw_5.4.238\+git-20160214-2_powerpc_8540.ipk uboot-envtools_2021.01-15_powerpc_8540.ipk
    sh /tmp/ubootfix.sh
    # this may throw an error
    # Warning: Bad CRC, using default environment
    # you can ignore it

## Permanently Install OpenWRT 23.05.3

From your host machine.

    scp -O /srv/ftp/openwrt-23.05.3-mpc85xx-p1020-aerohive_hiveap-330-squashfs-sysupgrade.bin root@192.168.1.1:/tmp/sysupgrade.bin

SSH into the router.

    ssh root@192.168.1.1
    sysupgrade -n /tmp/sysupgrade.bin

This will write OpenWRT to the AP330, it'll take about 10 minutes, the router will flash red while it upgrades.  You can monitor the upgrade from your Serial terminal.

The unit will automatically reboot after, then flash blue.  The first boot should take another 60 seconds, the light will eventually turn solid green when complete.

## Install ca-certificates

You will need ca-certificates package to update opkg and install other packages.

From your host machine.

    ssh-keygen -f $HOME/.ssh/known_hosts -R "192.168.1.1"
    wget https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/ca-certificates_20230311-1_all.ipk
    scp -O ca-certificates_20230311-1_all.ipk root@192.168.1.1:/tmp/
    ssh root@192.168.1.1 "opkg install /tmp/ca-certificates_20230311-1_all.ipk"
    ssh root@192.168.1.1 "rm /tmp/ca-certificates_20230311-1_all.ipk"

**Note:** The package directories are as follows...

* Core: https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages
* Kmods: https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/kmods/5.15.137-1-cda1f0deccee98a1cce5be2a8ce92db2/
* Base: https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base
* Luci: https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/luci
* Packages: https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/packages
* Routing: https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/routing
* Telephony: https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/telephony

## LuCi & Clean-Up

You can open LuCI from 192.168.1.1 now. I had to use Chrome, Firefox was glitching on it for some reason.

You can `rm` the files in `/srv/ftp`.

