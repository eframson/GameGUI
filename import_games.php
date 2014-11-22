<?php

	$db = new mysqli("127.0.0.1", "root", "", "games");
	
	$games=file("complete_game_list.txt");
	
	foreach($games as $line){
		$data=explode("	",$line);
		$title=$db->real_escape_string($data[0]);
		$source=$db->real_escape_string($data[1]);
		$platform = (trim($data[2])) ? $db->real_escape_string(trim($data[2])) : "NULL" ;
		echo "INSERT INTO game_entities (title,source,platform) VALUES (\"$title\",\"$source\",\"$platform\");<br />";
	}

?>