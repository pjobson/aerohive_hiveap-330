# MediaTek MT7915E Card

The Aerohive HiveAP 330 can be upgraded to 802.11ac/ax/b/g/n with a MediaTek MT7915E.

The only one I could find for sale is [this model](https://asiarf.com/product/wi-fi-6-11ax-4t4r-mini-pcie-module-mt7915-aw7915-np1/).

## Install Cards

I tried various combinations using the MT7915E and original cards. The
only working combination is MT7915E in the slot marked PCIE-1 5G and
the original A2HP01 in the slot marked PCIE-0 2G.

## Install Software

Assuming you're using OpenWRT version 23.05.3.

From your host machine:

    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-mt76-connac_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-mt76-core_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-mt7915e_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-mt7915-firmware_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk
    wget https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-thermal_5.15.150-1_powerpc_8548.ipk

    scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
       *.ipk root@192.168.1.1:/tmp/

From your router:

    cd /tmp
    opkg install \
        kmod-mt76-connac_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk \
        kmod-mt76-core_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk \
        kmod-mt7915e_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk \
        kmod-mt7915-firmware_5.15.150+2023-09-11-f1e1e67d-1_powerpc_8548.ipk \
        kmod-thermal_5.15.150-1_powerpc_8548.ipk
    reboot && exit

That is it.
