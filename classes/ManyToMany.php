<?php

require_once('EnhancedModel.php');

abstract class ManyToMany extends EnhancedModel {

	protected function _manyToManyField($class_name, $ids_to_set = array(), $extra_fields_to_set = array(), $join_class_base = "GameEntity", $join_class_base_id = null){

		$join_class_name = $join_class_base . $class_name;
		$join_class_base_id = ($join_class_base_id) ? $join_class_base_id : Helper::decamelize($join_class_base) . "_id";
		$id_field = strtolower($class_name) . "_id";

		if(!empty($ids_to_set)){
			if(!is_array($ids_to_set)){
				$ids_to_set = array($ids_to_set);
			}

			$ids_to_delete = array();
			$ids_to_add = $ids_to_set;
			$existing_objects = $this->has_many_through($class_name)->find_many();

			foreach($existing_objects as $object){
				if( !array_search($object->id, $ids_to_set) ){
					array_push($ids_to_delete, $object->id);
				}else if( ($key = array_search($object->id, $ids_to_add)) !== false ){
					unset($ids_to_add[$key]);
				}
			}

			if(!empty($ids_to_delete)){
				Model::factory($join_class_name)
				->where($join_class_base_id, $this->id)
				->where_in($id_field, $ids_to_delete)
				->delete_many();
			}

			if(!empty($ids_to_add)){
				foreach($ids_to_add as $obj_id){
					$object = Model::factory($join_class_name)->create();
					$object->game_entity_id = $this->id;
					$object->$id_field = $obj_id;

					if(	!empty($extra_fields_to_set)
						&& array_key_exists($obj_id, $extra_fields_to_set)
						&& !empty($extra_fields_to_set[$obj_id]) ){

						foreach($extra_fields_to_set[$obj_id] as $field => $value){
							$object->$field = $value;
						}
					}

					$object->save();
				}
			}

		}else{
			return $this->has_many_through($class_name)->find_many();
		}

	}

	protected function _hasManyField($class_name){

		return $this->has_many($class_name);

	}

}