<?php
	require_once('lib/idiorm.php');
	require_once('lib/paris.php');
	require_once('classes/GameEntity.php');
	
	require_once('lib/Slim/Slim.php');
	\Slim\Slim::registerAutoloader();
	
	ORM::configure('mysql:host=localhost;port=3306;dbname=games');
	ORM::configure('username','eframson');
	ORM::configure('password','123123');
	ORM::configure('logging', true);
	ORM::configure('driver_options', array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));
	
	$app = new \Slim\Slim();

	$app->get('/games', 'getAllGames');
	$app->get('/games/', 'getAllGames');

	$app->get('/games/:id',	'getGamesByIds');
	
	$app->post('/games', 'addGame');

	$app->put('/games', 'updateGame');
	$app->put('/games/', 'updateGame');

	$app->delete('/games/:id',	'deleteGame');

	//$app->get('/games/search/:query', 'findGame');

	$app->run();
	
	function getAllGames(){
		try{
			//$results should be an array of GameEntity objects
			$results = Model::factory('GameEntity')
					->order_by_asc('title')
					->find_many();

			$data = array();
			foreach($results as $idx => $game){
				$data["games"][] = $game->as_array();
			}

			showResponse("success", $data);
		}catch(Exception $e){
			showResponse("error", array(), $e->getMessage());
		}
	}
	
	function getGamesByIds($id){
		
		$ids = json_decode($id);

		if($ids == null){
			showResponse("fail", array(), "No IDs received");
		}else{

			if(!is_array($ids)){
				$ids = array($ids);
			}

			try{

				$results = Model::factory('GameEntity')
				    ->where_in('id', $ids)
				    ->find_many();

				$data = array();
				foreach($results as $idx => $result){
					$data["games"][] = $result->as_array();
				}

				showResponse("success", $data);

			}catch(Exception $e){
				showResponse("error", array(), $e->getMessage());
			}
		}
	}
	
	function addGame(){
		$gameData = getRequestBody();

		if($gameData == null || count($gameData) == 0){
			showResponse("fail", array(), "No data received");
		}else{

			$game = Model::factory('GameEntity')->create();

			try{

				foreach ($gameData as $prop => $value) {
					if($prop == "id"){
						continue;
					}
					$game->$prop = $value;
				}

				$response = $game->save();

				$data = array();
				if($response == 1){
					$data["games"][] = $game->as_array();
					showResponse("success", $data);
				}else{
					showResponse("error", $data, "Could not save game: " . $response);
				}

			}catch(Exception $e){
				showResponse("error", array(), $e->getMessage());
			}
		}

	}

	function deleteGame($id){

		$ids = json_decode($id);

		if($ids == null){
			showResponse("fail", array(), "No IDs received");
		}else{

			if(!is_array($ids)){
				$ids = array($ids);
			}

			$result_array = array();

			try{
				$games = Model::factory('GameEntity')->where_in('id', $ids)->find_many($ids);

				foreach( $games as $game ){

					$game_id = $game->id;
					$response = $game->delete();
					$result_array["games"][$game_id] = $response;

				}

				showResponse("success", $result_array);

			}catch(Exception $e){
				$hadErrorsFlag = true;
				showResponse("error", $result_array, $e->getMessage());
			}
		}
	}
	
	function updateGame(){

		$gameData = getRequestBody();

		if($gameData == null || count($gameData) == 0){
			showResponse("fail", array(), "No data received");
		}else{

			//Get an array of the IDs of the games we want to update
			$ids = array_map(function($game){
				return $game["id"];
			}, $gameData);

			//Init some arrays
			$result_array = array();
			$indexedGames = array();

			try{
				//Retrieve an array of game objects from the DB
				$games = Model::factory('GameEntity')->where_in('id', $ids)->find_many($ids);

				//Create arrays of DB and frontend response data indexed by game ID
				foreach( $games as $game ){
					$indexedGames[$game->id] = $game;
					$result_array["games"][$game->id] = 0;
				}

				//For each game present in the update array
				foreach ($gameData as $id => $data) {

					//Retrieve the appropriate game object
					$game = $indexedGames[$data["id"]];
					
					//For each property in the game update array
					foreach ($data as $prop => $value) {
						
						if($prop == "id" || $prop == "selected"){
							continue;
						}
						$game->$prop = $value;
					}

					$game->save();
					$result_array["games"][$game->id] = $game->as_array();
				}

				showResponse("success", $result_array);

			}catch(Exception $e){
				$hadErrorsFlag = true;
				showResponse("error", $result_array, $e->getMessage());
			}
		}

	}

	function showResponse($status, $data, $message = null, $code = null){
		
		$output=array(
			"status" 	=> $status,
			"data"		=> $data,
		);
		if($message){
			$output["message"] = $message;
		}
		if($code){
			$output["code"] = $code;
		}
		echo json_encode($output);
	}
	
	function getRequestBody(){
		$request = \Slim\Slim::getInstance()->request();
		$body = $request->getBody();
		$gameData = json_decode($body, true);
		
		return $gameData;
	}

	//Deprecated in favor of implementing the search on the frontend
	/*
	function findGame($query){
		$terms=urldecode($query);
		$terms=parse_term($terms);
		
		$games = Model::factory('GameEntity');
		
		foreach($terms as $field => $needle) {
			$games->where_like($field, "%" . $needle . "%");
		}
		
		$results = $games->find_many();
		
		showResults($results);
	}
	
	function parse_term($term){
		$split=explode("|",$term);
		$return = array();
		
		if( count($split) == 1 ){
			$category = null;
			$term = $split[0];
		}else{
			$category = $split[0];
			$term = $split[1];
		}
		
		$return["title"]=$term;
		if(isset($category)){
			$return["source"]=$category;
		}
		
		return $return;
	}
	*/
?>