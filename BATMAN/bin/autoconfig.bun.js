#!/usr/bin/env bun

import { $ } from "bun";

// read -p "ETHINTERFACE Port: "     ETHINTERFACE
// read -p "Primary Router IP: " PRIMARY_IP
// read -p "Node Host Name: "    NODE_HOSTNAME
// read -p "Node IP Address: "   NODE_IP
// read -p "Node Password: "     NODE_PASSWORD
// read -p "Mesh SSID: "         MESH_SSID
// read -p "Mesh Password: "     MESH_PASSWORD

const ETHINTERFACE="enxa0cec8dafeec"
const PRIMARY_IP="10.10.10.1"
const NODE_HOSTNAME="gozer-node3"
const NODE_IP="10.10.10.13"
const NODE_PASSWORD="f##MAUvW7wPU!^5n"
const MESH_SSID="GOZER-MESH"
const MESH_PASSWORD="14_N_Moore_Street"

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


const pkgs = [
	{ md5:'488bfb70706a60b568779cd8133363dc', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/routing/batctl-full_2023.1-2_powerpc_8548.ipk' },
	{ md5:'cf4823c9855d6598e22cc19b2ebeb6da', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-batman-adv_5.15.150+2023.1-6_powerpc_8548.ipk' },
	{ md5:'d04d0e1bcc99493c5464043d0333b05b', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/kmod-lib-crc16_5.15.150-1_powerpc_8548.ipk' },
	{ md5:'ad6b3d2a139d01baeb9aea9dd5216a7e', url:'https://downloads.openwrt.org/releases/23.05.3/targets/mpc85xx/p1020/packages/librt_1.2.4-4_powerpc_8548.ipk' },
	{ md5:'1a9260c610102ad34216604b9497c97d', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/libwolfssl5.6.4.e624513f_5.6.4-stable-1_powerpc_8548.ipk' },
	{ md5:'504bf5c9e5a37fff8a521e0e411deeb9', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/luci/luci-proto-batman-adv_git-22.104.47289-0a762fd_all.ipk' },
	{ md5:'9621495f1e4730074a99ddea348a0941', url:'https://downloads.openwrt.org/releases/23.05.3/packages/powerpc_8548/base/wpad-mesh-wolfssl_2023-09-08-e5ccbfc6-6_powerpc_8548.ipk' }
];


console.log("Getting files...");
await $`mkdir -p files/`;
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

process.exit(0);

console.log(`Checking ${ETHINTERFACE}...`);
const ethercheck = await $`ip address show ${ETHINTERFACE}`.nothrow().quiet();
if (ethercheck.stderr.length > 0) {
	console.log(`Cannot find ${ETHINTERFACE}`);
	console.log(`To show your interfaces run: ip address`);
	process.exit(0);
}

console.log(`Setting DHCP on ${ETHINTERFACE}`);
await `sudo ip addr flush ${ETHINTERFACE}`;
await `sudo dhclient ${ETHINTERFACE} -v`;

console.log("Waiting for DHCP address...");
const firstDHCP = await getDHCPAddr(ETHINTERFACE);


