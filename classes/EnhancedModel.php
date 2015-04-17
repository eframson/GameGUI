<?php
require_once($_SERVER[DOCUMENT_ROOT] . '/games/lib/paris.php');

class EnhancedModel extends Model {

	protected $_add_to_array = array();

	public function after_load(){
		//This should be implemented in a child class
	}

	public function add_to_array(){
		return $this->_add_to_array;
	}

	public function as_array(){
		
		//Just recreating the parent function here because I can't figure out how to pass the args up to parent:: >.>
        $args = func_get_args();
        $array = call_user_func_array(array($this->orm, 'as_array'), $args);

		return array_merge($array, $this->add_to_array());
	}

}