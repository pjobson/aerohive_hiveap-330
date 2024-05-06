# Cycling Rainbow LED

I wanted to color cycle my LED through an RGB, like:

![RGB Colorwheel](https://raw.githubusercontent.com/pjobson/aerohive_hiveap-330/main/CYCLING_LED/rainbow.png)

The AP300 has a 3 color LED for displaying status:

| Color | Class       | Description            |
| ----- | ----------- | ---------------------- |
| Red   | fault:red   | Flashing/Error         |
| Green | power:green | Power On or Booting Up |
| Blue  | blue        | Initial Boot           |

## CLI LED Control

You can modify the color and brightness of the LED via cli with:

    # Set On
    echo "default-on" > /sys/class/leds/fault:red/trigger
    echo "default-on" > /sys/class/leds/power:green/trigger
    echo "default-on" > /sys/class/leds/blue/trigger

    # Set Brighness 0-255
    echo "0" > /sys/class/leds/fault:red/brightness
    echo "0" > /sys/class/leds/power:green/brightness
    echo "0" > /sys/class/leds/blue/brightness

## Install

In the router:

    opkg update
    opkg install bash
    cd ~
    wget https://raw.githubusercontent.com/pjobson/aerohive_hiveap-330/main/CYCLING_LED/bin/ledcycle.sh
    chmod +x ledcycle.sh

Edit your `/etc/rc.local`, to:

    /bin/bash /root/ledcycle.sh

    exit 0
