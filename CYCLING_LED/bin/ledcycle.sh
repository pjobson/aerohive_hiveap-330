#!/bin/bash

# RGB Cycling Script for Aerohive HiveAP-330


# RGB Class Paths
# If you have a non-Aerohive router, you can change these
RED_CLASS="/sys/class/leds/fault:red"
GRN_CLASS="/sys/class/leds/power:green"
BLU_CLASS="/sys/class/leds/blue"

# Color Table for Reference
# Color   | RED | GREEN | BLUE |
# --------|-----|-------|------|
# Red     | 255 |     0 |    0 |
# Orange  | 255 |   127 |    0 |
# Yellow  | 255 |   255 |    0 |
# Lime    | 127 |   255 |    0 |
# Green   |   0 |   255 |    0 |
# Teal    |   0 |   255 |  127 |
# Cyan    |   0 |   255 |  255 |
# Azure   |   0 |   127 |  255 |
# Blue    |   0 |     0 |  255 |
# Indigo  | 127 |     0 |  255 |
# Magenta | 255 |     0 |  255 |
# Coral   | 255 |     0 |  127 |

# Globals
declare cRed
declare cGrn
declare cBlu
declare -a COLORS

# Color Array
# Change these if you want to change your cycle
COLORS[0]='RED;255;0;0'
COLORS[1]='ORANGE;255;127;0'
COLORS[2]='YELLOW;255;255;0'
COLORS[3]='LIME;127;255;0'
COLORS[4]='GREEN;0;255;0'
COLORS[5]='TEAL;0;255;127'
COLORS[6]='CYAN;0;255;255'
COLORS[7]='AZURE;0;127;255'
COLORS[8]='BLUE;0;0;255'
COLORS[9]='INDIGO;127;0;255'
COLORS[10]='MAGENTA;255;0;255'
COLORS[11]='CORAL;255;0;127'

# Start at the last color
# so first run will be the 0th
CURRENTCOLOR=11

# Divisors of Each Color
# This is the number of steps between each color in the array
# Lowering this will speed up the transitions, the range is
# probably about fastest 5-100 slowest
CYCLES=50

start () {
	# Turn all LEDs on
	echo "default-on" > $RED_CLASS/trigger
	echo "default-on" > $GRN_CLASS/trigger
	echo "default-on" > $BLU_CLASS/trigger
	# Set brightness to 0
	echo "0" > $RED_CLASS/brightness
	echo "0" > $GRN_CLASS/brightness
	echo "0" > $BLU_CLASS/brightness
	# Current RGB
	cRed=$(cat $RED_CLASS/brightness)
	cGrn=$(cat $GRN_CLASS/brightness)
	cBlu=$(cat $BLU_CLASS/brightness)

	toColor
}

toColor () {
	if [ $CURRENTCOLOR -eq 11 ]; then
		CURRENTCOLOR=0
	else
		CURRENTCOLOR=$[$CURRENTCOLOR+1]
	fi

	# Split up current color
	IFS=";" read -r -a WCOLOR <<< "${COLORS[$CURRENTCOLOR]}"

	# Wanted RGB
	wRed="${WCOLOR[1]}"
	wGrn="${WCOLOR[2]}"
	wBlu="${WCOLOR[3]}"

	# if wanted > current ? wanted-current/cycles : current-wanted/cycles
	[ $wRed -gt $cRed ] && dRed=$[$[$wRed-$cRed]/$CYCLES] || dRed=$[$[$cRed-$wRed]/$CYCLES]
	[ $wGrn -gt $cGrn ] && dGrn=$[$[$wGrn-$cGrn]/$CYCLES] || dGrn=$[$[$cGrn-$wGrn]/$CYCLES]
	[ $wBlu -gt $cBlu ] && dBlu=$[$[$wBlu-$cBlu]/$CYCLES] || dBlu=$[$[$cBlu-$wBlu]/$CYCLES]

	# debug
	#echo ${WCOLOR[0]}
	DONE=0
	while [ $DONE -ne 1 ]; do
		# debug
		#echo ${WCOLOR[0]} $cRed $cGrn $cBlu
		#########
		# RED
		#########
		if [ $cRed -ne $wRed ]; then
			if [ $cRed -gt $wRed ]; then
				cRed=$[$cRed-$dRed]
				[ $cRed -lt 0 ] && cRed=0 || cRed=$cRed
			else
				cRed=$[$cRed+$dRed]
				[ $cRed -gt $wRed ] && cRed=$wRed || cRed=$cRed
			fi
		fi

		#########
		# GREEN
		#########
		if [ $cGrn -ne $wGrn ]; then
			if [ $cGrn -gt $wGrn ]; then
				cGrn=$[$cGrn-$dGrn]
				[ $cGrn -lt 0 ] && cGrn=0 || cGrn=$cGrn
			else
				cGrn=$[$cGrn+$dGrn]
				[ $cGrn -gt $wGrn ] && cGrn=$wGrn || cGrn=$cGrn
			fi
		fi


		#########
		# BLUE
		#########
		if [ $cBlu -ne $wBlu ]; then
			if [ $cBlu -gt $wBlu ]; then
				cBlu=$[$cBlu-$dBlu]
				[ $cBlu -lt 0 ] && cBlu=0 || cBlu=$cBlu
			else
				cBlu=$[$cBlu+$dBlu]
				[ $cBlu -gt $wBlu ] && cBlu=$wBlu || cBlu=$cBlu
			fi
		fi

		# wRedITE COLORS TO BRIGHTNESS HERE
		echo "$cRed" > $RED_CLASS/brightness
		echo "$cGrn" > $GRN_CLASS/brightness
		echo "$cBlu" > $BLU_CLASS/brightness

		# if all colors are their wanted colors, then we're done
		if [ $cRed -eq $wRed ] && [ $cGrn -eq $wGrn ] && [ $cBlu -eq $wBlu ]; then
			DONE=1
		fi
	done

	toColor
}

start

#eof
