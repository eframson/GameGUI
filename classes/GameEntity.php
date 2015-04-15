<?php

class GameEntity extends Model {
		
	public function save(){
		$now = new DateTime();
		if(!isset($this->id)){
			$this->date_created = $now->format("Y-m-d H:i:s");
		}
		$this->date_updated = $now->format("Y-m-d H:i:s");
		return parent::save();		
	}

	public function sources(){
		return $this->has_many_through('Source');
	}

	public function platforms(){
		return $this->has_many_through('Platform');
	}
	
}