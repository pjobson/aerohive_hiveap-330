. /lib/functions.sh
. /lib/functions/system.sh
insmod mtd-rw i_want_a_brick=y || exit 3
echo "/dev/mtd$(find_mtd_index u-boot-env) 0x0 0x20000 0x10000" > "/etc/fw_env.config"
fw_setenv owrt_boot 'setenv bootargs console=ttyS0,9600;bootm 0xEC040000 - 0xEC000000'
cp "/dev/mtd$(find_mtd_index 'u-boot')" /tmp/uboot
cp /tmp/uboot /tmp/uboot_patched
strings -td < /tmp/uboot | grep '^ *[0-9]* *\(run owrt_boot\|setenv bootargs\).*cp\.l' |
awk '{print $1}' |
while read offset; do
echo -n "run owrt_boot;            " | dd of=/tmp/uboot_patched bs=1 seek=${offset} conv=notrunc
done
mtd write /tmp/uboot_patched u-boot
uci set system.@system[0].compat_version=2.0; uci commit;
