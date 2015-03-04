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

	$app->get('/games', 'getGames');
	$app->get('/games/', 'getGames');
	$app->get('/games/:id',	'getGame');
	$app->get('/games/search/:query', 'findGame');
	$app->post('/games', 'addGame');
	$app->put('/games/:id', 'updateGame');
	$app->delete('/games/:id',	'deleteGame');

	$app->run();
	
	function getGames(){
		$results = Model::factory('GameEntity')
				->order_by_asc('title')
				->find_many();

		showResults($results);
	}
	
	function getGame($id){
		$ids = json_decode(($id));

		if(!is_array($ids)){
			$ids = array($ids);
		}

		$results = Model::factory('GameEntity')
				    ->where_in('id', $ids)
				    ->find_many();
					
		showResults($results);
	}
	
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
	
	function addGame(){
		$gameData = getData();
		
		$game = Model::factory('GameEntity')->create();
		
		foreach ($gameData as $prop => $value) {
			if($prop == "id"){
				continue;
			}
			$game->$prop = $value;
		}
		
		try {
			$response = $game->save();
		}catch( Exception $e){
			$response = $e->getMessage();
		}
		
		if( $response == 1 ){
			showSuccess("Created successfully",$game);
		}else{
			showError("Object could not be created");
		}
	}
	
	function updateGame($id){

		$gameData = getData();

		$ids = json_decode(($id));

		if(!is_array($ids)){
			$ids = array($ids);
		}

		$result_array = array();
		$hadErrorsFlag = false;
		
		try {
			$games = Model::factory('GameEntity')->where_in('id', $ids)->find_many($ids);
		}catch( Exception $e){
			$hadErrorsFlag = true;
		}

		if(!$hadErrorsFlag){
			foreach( $games as $game ){

				foreach ($gameData as $prop => $value) {
					if($prop == "id" || $prop == "selected"){
						continue;
					}
					$game->$prop = $value;
				}
				
				try{
					$game->save();
					$response = $game->as_array();
				}catch( Exception $e){
					$hadErrorsFlag = true;
					$response = $e->getMessage();
				}

				$result_array[$game->id] = $response;
			}

			if( !$hadErrorsFlag ){
				showSuccess("All objects updated successfully",$result_array);
			}else{
				showError("Some objects could not be updated",$result_array);
			}
		}else{
			showError($e->getMessage());
		}
		
	}
	
	function deleteGame($id){
	
		$ids = json_decode($id);

		if($ids == null){
			showError("No IDs received");
			return;
		}

		if(!is_array($ids)){
			$ids = array($ids);
		}

		$result_array = array();
		$hadErrorsFlag = false;
		
		try {
			$games = Model::factory('GameEntity')->where_in('id', $ids)->find_many($ids);
		}catch( Exception $e){
			$hadErrorsFlag = true;
		}

		if(!$hadErrorsFlag){
			foreach( $games as $game ){
			
				$game_id = $game->id;
				
				try{
					$response = $game->delete();
				}catch( Exception $e){
					$hadErrorsFlag = true;
					$response = $e->getMessage();
				}

				$result_array[$game_id] = $response;
			}

			if( !$hadErrorsFlag ){
				showSuccess("All objects deleted successfully",$result_array);
			}else{
				showError("Some objects could not be deleted",$result_array);
			}
		}else{
			showError($e->getMessage());
		}
	}
	
	function showResults($results){
			
		if($results){
			$resultsArray = array();
			foreach($results as $idx => $result){
				$resultsArray[] = $result->as_array();
			}
			
			$output=array(
				"count"=>count($results),
				"success"=>"1",
				"results"=>$resultsArray
			);
			
			echo json_encode($output);
		}else{
			showError("No results returned");
		}
		
	}
	
	function showError($msg, $detailArray=null){
		$output=array(
			"error"=>"1",
			"success"=>"0",
			"msg"=>$msg
		);
		if($detailArray){
			$output["detailArray"]=$detailArray;
		}
		echo json_encode($output);
	}
	
	function showSuccess($msg, $object=null){
		$output=array(
			"error"=>"0",
			"success"=>"1",
			"msg"=>$msg
		);
		if($object){
			if(!is_array($object)){
				$output["successObject"]=$object->as_array();
			}else{
				$output["successObject"]=$object;
			}
		}
		echo json_encode($output);
	}
	
	function getData(){
		$request = \Slim\Slim::getInstance()->request();
		$body = $request->getBody();
		$gameData = json_decode($body, true);
		
		return $gameData;
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
?>