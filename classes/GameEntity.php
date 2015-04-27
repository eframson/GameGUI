<?php

require_once('classes/Helper.php');
require_once('classes/ManyToMany.php');
require_once('classes/Platform.php');
require_once('classes/Source.php');
require_once('classes/GameEntityPlatform.php');
require_once('classes/GameEntitySource.php');

class GameEntity extends ManyToMany {

	public $sources = array();
	public $platforms = array();
		
	public function save(){

		$now = new DateTime();
		if(!isset($this->id)){
			$this->date_created = $now->format("Y-m-d H:i:s");
		}
		$this->date_updated = $now->format("Y-m-d H:i:s");

		//Eventually this should be hooked up, but for now we just don't want it to break
		$third_party_ids = ($this->source_ids) ? $this->source_ids : (array_key_exists("source_ids", $this->_add_to_array)) ? $this->_add_to_array["source_ids"] : null;
		$this->orm->offsetUnset("source_ids");
		//unset($this->_add_to_array["source_ids"]);
		error_log(print_r($this,true));

		foreach($this->platforms as &$platform_id){
			//If we one of the "ids" isn't an ID, let's assume it's a new platform
			if(!is_numeric($platform_id)){

				$new_platform = Model::factory('Platform')->create();
				$new_platform->name = $platform_id;
				$new_platform->save();
				$platform_id = $new_platform->id;

			}
		}

		foreach($this->sources as &$source_id){
			//If we one of the "ids" isn't an ID, let's assume it's a new platform
			if(!is_numeric($source_id)){

				$new_source = Model::factory('Source')->create();
				$new_source->name = $source_id;
				$new_source->save();
				$source_id = $new_source->id;

			}
		}

		$sources_to_add = $this->sources;
		$platforms_to_add = $this->platforms;

		$response = parent::save();

		//Hook up our game + platform and game + source associations
		$this->platforms($platforms_to_add);
		$this->sources($sources_to_add);

		//Update the object with the latest-and-greatest
		$this->after_load();

		return $response;
	}

	public function after_load(){

		$this->sources = array_map(function($source){
			return $source->id;
		}, $this->sources());
		$this->_add_to_array["sources"] = $this->sources;

		//This should be 100% functional, but the frontend can't handle it yet
		/*$source_metas = $this->_hasManyField("GameEntitySource")->find_many();
		$this->_add_to_array["source_ids"] = array_combine(
			array_map(function($source_meta){
				return $source_meta->source_id;
			}, $source_metas),
			array_map(function($source_meta){
				return $source_meta->third_party_id;
			}, $source_metas)
		);*/

		$this->platforms = array_map(function($platform){
			return $platform->id;
		}, $this->platforms());
		$this->_add_to_array["platforms"] = $this->platforms;
	}

	public function sources($args = array()){
		return $this->_manyToManyField("Source", $args);
	}

	public function platforms($args = array()){
		return $this->_manyToManyField("Platform", $args);
	}
	
}