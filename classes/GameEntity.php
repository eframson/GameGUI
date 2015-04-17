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

		parent::save();

		//Hook up our game + platform and game + source associations
		$this->platforms($platforms_to_add);
		$this->sources($sources_to_add);

		//Update the object with the latest-and-greatest
		$this->after_load();

		return $this;
	}

	public function after_load(){

		$this->sources = array_map(function($source){
			return $source->id;
		}, $this->sources());
		$this->_add_to_array["sources"] = $this->sources;

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