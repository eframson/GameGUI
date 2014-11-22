<?php
	require_once('lib/idiorm.php');
	require_once('lib/paris.php');
	require_once('classes/GameEntity.php');
	
	require_once('lib/Slim/Slim.php');
	\Slim\Slim::registerAutoloader();
	
	ORM::configure('mysql:host=localhost;port=3306;dbname=games');
	ORM::configure('username','game');
	ORM::configure('password','123123');
	ORM::configure('logging', true);
	ORM::configure('driver_options', array(PDO::MYSQL_ATTR_INIT_COMMAND => 'SET NAMES utf8'));
	
	$app = new \Slim\Slim();

	$app->get('/games', 'getGames');
	$app->get('/games/:id',	'getGame');
	$app->get('/games/search/:query', 'findGame');
	$app->post('/games', 'addGame');
	$app->put('/games/:id', 'updateGame');
	$app->delete('/games/:id',	'deleteGame');

	$app->run();
	
	function getGames(){
		$results = Model::factory('GameEntity')
				->find_many();

		showResults($results);
	}
	
	function getGame($id){
		$results = Model::factory('GameEntity')
				    ->where('id', $id)
				    ->find_one();
					
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
			$response = $e->getMessge();
		}
		
		if( $response == 1 ){
			showSuccess("Created successfully");
		}else{
			showError("Object could not be created");
		}
	}
	
	function updateGame($id){
		//@TODO Consider making this an Idiorm thing so we don't have to load the model first (again)?
		$gameData = getData();
		
		$game = Model::factory('GameEntity')->find_one($gameData["id"]);
		
		foreach ($gameData as $prop => $value) {
			if($prop == "id"){
				continue;
			}
			$game->$prop = $value;
		}
		
		try {
			$response = $game->save();
		}catch( Exception $e){
			$response = $e->getMessge();
		}
		
		if( $response == 1 ){
			showSuccess("Updated successfully");
		}else{
			showError("Object could not be updated");
		}
		
	}
	
	function deleteGame($id){
		$game = Model::factory('GameEntity')->find_one($id);
		
		try {
			$response = $game->delete();
		}catch( Exception $e){
			$response = $e->getMessge();
		}
		
		if( $response == 1 ){
			showSuccess("Deleted successfully");
		}else{
			showError("Object could not be deleted");
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
	
	function showError($msg){
		$output=array(
			"error"=>"1",
			"success"=>"0",
			"msg"=>$msg
		);
		echo json_encode($output);
	}
	
	function showSuccess($msg){
		$output=array(
			"error"=>"0",
			"success"=>"1",
			"msg"=>$msg
		);
		echo json_encode($output);
	}
	
	function getData(){
		$request = \Slim\Slim::getInstance()->request();
		$body = $request->getBody();
		$gameData = json_decode($body, true);
		
		return $gameData;
	}
	
	function parse_term($term){
		$split=explode(":",$term);
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