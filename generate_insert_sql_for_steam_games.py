import json
import requests
import sys

lines_to_write_out = []

with open("steam_games_to_import.psv") as f:
    list_of_game_data_to_import = f.readlines()
# you may also want to remove whitespace characters like `\n` at the end of each line
list_of_game_data_to_import = [x.strip() for x in list_of_game_data_to_import]

game_data = {}
for game_data_line in list_of_game_data_to_import:
	game_data_fields = game_data_line.split("|")
	insert_string = """
INSERT INTO games.game_entity
(title, date_created, date_updated)
VALUES
(\"""" + game_data_fields[1] + """\",\"""" + game_data_fields[2] + """\", NOW());
	"""

	lines_to_write_out.append(insert_string)
	#source 3 = Steam
	insert_string = """
INSERT INTO games.game_entity_source
(game_entity_id, source_id, third_party_id)
VALUES
(LAST_INSERT_ID(),3,""" + game_data_fields[0] + """);
	"""
	lines_to_write_out.append(insert_string)

	#platform 3 = Windows
	#platform 2 = Mac
	#platform 1 = Linux

	if(game_data_fields[3] == "1"):
		insert_string = """
INSERT INTO games.game_entity_platform
(game_entity_id, platform_id)
VALUES
(LAST_INSERT_ID(),3);
	"""
		lines_to_write_out.append(insert_string)

	if(game_data_fields[4] == "1"):
		insert_string = """
INSERT INTO games.game_entity_platform
(game_entity_id, platform_id)
VALUES
(LAST_INSERT_ID(),2);
	"""
		lines_to_write_out.append(insert_string)

	if(game_data_fields[5] == "1"):
		insert_string = """
INSERT INTO games.game_entity_platform
(game_entity_id, platform_id)
VALUES
(LAST_INSERT_ID(),1);
	"""
		lines_to_write_out.append(insert_string)

outfile = open("insert_steam_games.sql", "w")
for line in lines_to_write_out:
	outfile.write(line)
outfile.close()