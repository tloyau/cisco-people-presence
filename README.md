# Cisco LightPresence Tutorial

In this tutorial, you are going to learn how to set up the LightPresence application and seen realtime people presence in your building thanks to your Cisco endpoints.

## 1. Enable RoomAnalytics on your endpoint

Before you start developing, you need first to enable RoomAnalytics in your endpoint. To do that, you have to follow these steps :

 1. With you favourite browser, go on the web interface of your endpoint. You need the IP of the endpoint to reach his interface.
 2. Normally, you will arrive on this web page ![enter image description here](https://image.noelshack.com/fichiers/2018/07/4/1518697133-capture-d-ecran-2018-02-15-a-13-17-04.png)

 3. After logging into your device, click in the menu on **Setup > Configuration** like below![enter image description here](https://image.noelshack.com/fichiers/2018/07/4/1518697699-capture-d-ecran-2018-02-15-a-13-20-32.png)
 4. Now, click on **RoomAnalytics** in the left side menu like below![enter image description here](https://image.noelshack.com/fichiers/2018/07/4/1518697776-capture-d-ecran-2018-02-15-a-13-29-22.png)
 5. We have two variables available to us. **PeopleCountOutOfCall** allow us to count the number of detected faces in front of the endpoint. **PeoplePresenceDetector** allow us to detect if there is a people presence or not in front of the endpoint.
 6. LightPresence application need these two variables enabled, so switch on both.
 7. We have now finish with endpoint set up. Let's continue with the LightPresence application importation.

## 2. Import the LightPresence application on your local machine

 1. Start by cloning the GitHub project

> git clone https://github.com/tloyau/cisco-people-presence.git
 1. Then, install all dependencies with NPM
> cd cisco-people-presence
> 
> npm install
 2. Now, open the file `config.json`
 3. This is where you can add your different endpoints. To add a terminal, proceed as follows :
> 		"CODEC_NAME": {
> 		// replace CODEC_NAME by the name of the endpoint you want to display in the interface
> 			"ip_address": "IP_ADDRESS",
> 			// replace IP_ADDRESS by the IP of your endpoint
> 			"mac_address": "MAC_ADDRESS",
> 			// replace MAC_ADDRESS by the MAC of your endpoint
> 			"username": "LOGIN",
> 			// replace LOGIN by the login for log into your endpoint web interface
> 			"password": "PASSWORD",
> 			// replace PASSWORD by the password for log into your endpoint web interface
> 			"type": "CODEC_TYPE"
> 			// replace CODEC_TYPE by the type of your endpoint (Examples : MX800, Room Kit Plus, etc.)
> 		}
 4. You can add as many endpoints as you want.
 5. You can now run the application with this command
> node server.js
 6. It will use the port you specified in the `config.json`
 7. For you information, the variable `checkPresenceTimeInterval` in the `config.json` is the time interval between two registration on your endpoints.
 8. LightPresence is now running on your local machine, you can access it with you favourite browser but I suggest you to use **Google Chrome** because it the best for managing SVG files.
> On you browser, go to `http://localhost:[PORT]`


----------
The setup of LightPresence is now finished. I hope you enjoy it and it was helpful for you.
If you have any questions, please contact me by mail or on Cisco Spark with this address

> tloyau@cisco.com
