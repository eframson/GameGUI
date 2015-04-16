<?php

require_once('classes/Helper.php');
require_once('classes/ManyToMany.php');
require_once('classes/Platform.php');
require_once('classes/Source.php');
require_once('classes/GameEntityPlatform.php');
require_once('classes/GameEntitySource.php');

class GameEntity extends ManyToMany {
		
	public function save(){
		$now = new DateTime();
		if(!isset($this->id)){
			$this->date_created = $now->format("Y-m-d H:i:s");
		}
		$this->date_updated = $now->format("Y-m-d H:i:s");

		$this->sources($this->source_ids);
		unset($this->source_ids);

		$this->platforms($this->platform_ids);
		unset($this->platform_ids);

		return parent::save();		
	}

	public function after_load(){
		error_log("after load is being called");
	}

	public function sources($args = array()){
		return $this->_manyToManyField("Source", $args);		
	}

	public function platforms($args = array()){
		return $this->_manyToManyField("Platform", $args);
	}
	
}