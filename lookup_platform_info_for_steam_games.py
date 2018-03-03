import json
import requests
import sys

with open("steam_ids_to_lookup.txt") as f:
    list_of_appids = f.readlines()
# you may also want to remove whitespace characters like `\n` at the end of each line
list_of_appids = [x.strip() for x in list_of_appids]

game_data = {}
for appid in list_of_appids:
	parameters = {"appids" : appid}
	response = requests.get("http://store.steampowered.com/api/appdetails/", params=parameters)

	if(response.status_code == 200):
		data = response.json()
		if(data[appid]["success"] == True):
			app_platforms = [
				int(data[appid]["data"]["platforms"]["windows"]),
				int(data[appid]["data"]["platforms"]["mac"]),
				int(data[appid]["data"]["platforms"]["linux"])
			]
			game_data[appid] = app_platforms
	
	if not(appid in game_data):
		game_data[appid] = None

outfile = open("retrieved_data.psv", "w")
outfile.write("AppID|Windows|Mac|Linux\n")
for key, value in game_data.items():
	if(value is None):
		outfile.write(key + "|NULL|NULL|NULL\n")
	else:
		outfile.write(key + "|" + str(value[0]) + "|" + str(value[1]) + "|" + str(value[2]) + "\n")
outfile.close()

# Print the content of the response (the data the server returned)
#print(response.content)

#data = response.json()
#print(type(data))
#print(data)