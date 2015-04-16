<?php

class CustomIdiorm extends ORM {

    /**
     * Create an ORM instance from the given row (an associative
     * array of data fetched from the database)
     */
    protected function _create_instance_from_row($row) {
        $instance = self::for_table($this->_table_name, $this->_connection_name);
        $instance->use_id_column($this->_instance_id_column);
        $instance->hydrate($row);
        $instance->after_load();
        return $instance;
    }

}