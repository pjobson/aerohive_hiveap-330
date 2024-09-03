#!/usr/bin/env bun

// You'll need bun to run this.
// curl -fsSL https://bun.sh/install | bash

import { $ } from "bun";

let ETHINTERFACE, PRIMARY_IP, NODE_HOSTNAME, NODE_IP,
	NODE_PASSWORD, MESH_SSID, MESH_PASSWORD, OPEN_FIREWALL;

process.stdout.write("Ethernet Interface [string]: ");
for await (const line of console) {
	ETHINTERFACE = line;
	break;
}
process.stdout.write("Primary Router IP [ip address]: ");
for await (const line of console) {
	PRIMARY_IP = line;
	break;
}
process.stdout.write("Node Host Name [string]: ");
for await (const line of console) {
	NODE_HOSTNAME = line;
	break;
}
process.stdout.write("Node IP Address [ip address]: ");
for await (const line of console) {
	NODE_IP = line;
	break;
}
process.stdout.write("Node SSH Password [string]: ");
for await (const line of console) {
	NODE_PASSWORD = line;
	break;
}
process.stdout.write("Mesh SSID [string]: ");
for await (const line of console) {
	MESH_SSID = line;
	break;
}
process.stdout.write("Mesh Password [string]: ");
for await (const line of console) {
	MESH_PASSWORD = line;
	break;
}
process.stdout.write("Open Firewall WAN [y/n]: ");
for await (const line of console) {
	OPEN_FIREWALL = (/[yY]/.test(line));
	break;
}

console.log(ETHINTERFACE);
console.log(PRIMARY_IP);
console.log(NODE_HOSTNAME);
console.log(NODE_IP);
console.log(NODE_PASSWORD);
console.log(MESH_SSID);
console.log(MESH_PASSWORD);
console.log(OPEN_FIREWALL);

// Gets the current DHCP Address
const getDHCPAddr = async () => {
	let dhcpAddr = '';
	while (dhcpAddr === "") {
		const out = await $`ip addr show ${ETHINTERFACE}`.nothrow().quiet();
		const matches = out.stdout.toString().match(/inet (\d+\.\d+\.\d+\.\d+).+?dynamic/);
		if (!matches) {
			await $`sleep 2`;
		} else {
			dhcpAddr = matches[1];
		}
	}
	return dhcpAddr;
}

// OpenWRT Packages Required
const pkgs = [
	{ md5:'488bfb70706a60b568779cd8133363dc', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/routing/batctl-full_2023.1-2_powerpc_8548.ipk' },
	{ md5:'cf4823c9855d6598e22cc19b2ebeb6da', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk' },
	{ md5:'d04d0e1bcc99493c5464043d0333b05b', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk' },
	{ md5:'ad6b3d2a139d01baeb9aea9dd5216a7e', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/librt_1.2.4-4_powerpc_8548.ipk' },
	{ md5:'1a9260c610102ad34216604b9497c97d', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk' },
	{ md5:'504bf5c9e5a37fff8a521e0e411deeb9', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/luci/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk' },
	{ md5:'9621495f1e4730074a99ddea348a0941', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk' }
];

console.log("Making temp folkder...");
await $`mkdir -p temp/`;

console.log("Checking for your SSH Key...");
const sshkeyexists = await Bun.file(`${process.env.HOME}/.ssh/id_rsa.pub`).exists();
if (!sshkeyexists) {
	console.log("Please generate an ssh-key: ssh-keygen -t rsa");
	process.exit(0);
}

console.log("Getting files...");
for (let i=0;i<pkgs.length;i++) {
	// filename is: files/whatever.pkg
	const filename = `files/${pkgs[i].url.split('/').pop()}`;
	// does this file exist?
	const exists = await Bun.file(`${filename}`).exists();
	// run md5sum, if exists set to false otherwise wait for result
	let md5sum = (!exists) ? false : await $`md5sum ${filename}`.nothrow().quiet();
	// check the sum.  if already set to false, skip
		md5sum = (!md5sum) ? false : md5sum.stdout.toString().split(/ +/)[0] === pkgs[i].md5;

	// if not md5sum (does not exist or invalid)
	if (!md5sum) {
		console.log(`  Getting: ${filename}`);
		await $`wget -O "${filename}" "${pkgs[i].url}"`.nothrow().quiet();
	} else {
		console.log(`  md5dum checked, skipping: ${filename}`);
	}
}

// checks to see if interface exists, if not show error and exit
console.log(`Checking ${ETHINTERFACE}...`);
const ethercheck = await $`ip address show ${ETHINTERFACE}`.nothrow().quiet();
if (ethercheck.stderr.length > 0) {
	console.log(`Cannot find ${ETHINTERFACE}`);
	console.log(`To show your interfaces run: ip address`);
	process.exit(0);
}

console.log(`Setting DHCP on ${ETHINTERFACE}.`);
console.log("This requires sudo permissions.");
// flush this interface
await `sudo ip addr flush ${ETHINTERFACE}`;
// set interface to dhcp
await `sudo dhclient ${ETHINTERFACE} -v`;

console.log("Waiting for DHCP address...");
const firstDHCP = await getDHCPAddr(ETHINTERFACE);

console.log("Uploading your ssh-key...");
await $`scp ${process.env.HOME}/.ssh/id_rsa.pub root@192.168.1.1:/etc/dropbear/authorized_keys`.nothrow().quiet();

console.log("Setting password...");
await $`ssh root@192.168.1.1 '( echo "${NODE_PASSWORD}"; sleep 1; echo "${NODE_PASSWORD}" )|/bin/passwd'`.nothrow().quiet();

console.log("Uploading config for ath9k Module...");
await $`scp stubs/ath9k root@192.168.1.1:/etc/modules.d/ath9k`.nothrow().quiet();

console.log("Updating system config...");
await $`cp -f stubs/system temp/system`.nothrow().quiet();
await $`sed -i "s/___NODE_HOSTNAME___/${NODE_HOSTNAME}/" temp/system`.nothrow().quiet();

console.log("Uploading system config...");
await $`scp temp/system root@192.168.1.1:/etc/config/`.nothrow().quiet();

console.log("Updating network config...");
await $`cp -f stubs/network temp/network`.nothrow().quiet();
await $`sed -i "s/___NODE_IP___/${NODE_IP}/g"       temp/network`;
await $`sed -i "s/___PRIMARY_IP___/${PRIMARY_IP}/g" temp/network`;
await $`sed -i "s/___PRIMARY_IP___/${PRIMARY_IP}/g" temp/network`;

console.log("Uploading config for network...");
await $`scp temp/network root@192.168.1.1:/etc/config/`.nothrow().quiet();

console.log("Updating wireless config...");
await $`cp -f stubs/wireless temp/wireless`.nothrow().quiet();
await $`sed -i "s/___MESH_SSID___/${MESH_SSID}/g" temp/wireless`;
await $`sed -i "s/___MESH_PASSWORD___/${MESH_PASSWORD}/g" temp/wireless`;

console.log("Uploading config for wireless...");
await $`scp temp/wireless root@192.168.1.1:/etc/config/`.nothrow().quiet();

console.log("Uploading config for dhcp...");
await $`scp stubs/dhcp root@192.168.1.1:/etc/config/`.nothrow().quiet();

if (OPEN_FIREWALL) {
	console.log("Uploading config for firewall...");
	await $`scp stubs/firewall root@192.168.1.1:/etc/config/`.nothrow().quiet();
}

console.log("Removing conflicting packages...");
await $`ssh root@192.168.1.1 "opkg remove wpad-basic wpad-basic-wolfssl wpad-basic-mbedtls"`.quiet().nothrow();

console.log("Uploading & Installing packages (abt 1 min)...");
await $`scp files/*.ipk root@192.168.1.1:/tmp/`.nothrow().quiet();
// install batman
await $`ssh root@192.168.1.1 opkg install /tmp/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk /tmp/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk /tmp/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk /tmp/batctl-full_2023.1-2_powerpc_8548.ipk /tmp/librt_1.2.4-4_powerpc_8548.ipk`.quiet().nothrow();
// install ssl
await $`ssh root@192.168.1.1 opkg install /tmp/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk /tmp/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk`.quiet().nothrow();

console.log("Rebooting Node...");
await $`ssh root@192.168.1.1 reboot`.nothrow().quiet();

console.log(`New IP Address is: ${NODE_IP}`);
console.log(`New Hostname is: ${NODE_HOSTNAME}`);
console.log(`You will now need to set your network interface to manual to connect to the unit directly.`);
