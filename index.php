<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		<link rel="shortcut icon" href="img/favicon.ico" type="image/x-icon" />
		<title>Game Library</title>

		<!-- Bootstrap -->
		<link href="css/bootstrap.min.css" rel="stylesheet">
		
		<!-- Bootstrap theme -->
		<link href="css/bootstrap-theme.min.css" rel="stylesheet">
		
		<!-- jQuery UI -->
		<link href="css/jquery-ui.min.css" rel="stylesheet">
		<!--<link href="css/jquery-ui.structure.min.css" rel="stylesheet">-->
		<!--<link href="css/jquery-ui.theme.min.css" rel="stylesheet">-->
		
		<!-- Bootstrap Datepicker -->
		<link href="css/bootstrap-datepicker.min.css" rel="stylesheet">
				
		<!-- Theme customizations -->
		<link href="css/custom.css" rel="stylesheet">

		<!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
		<!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
		<!--[if lt IE 9]>
		  <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
		  <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
		<![endif]-->
	</head>
	<!-- @TODOs
		- Put in some content in "home" so one tab's content can be easily distinguished from another
		- Clean up tab display logic
		- Re-sort list on partially successful update
		- Dynamic syntax highlighting for filter queries
		- Provide instructions for filter syntax somewhere
		- Show a user-friendly string translation of the filter string
		- Let users filter by NULL or empty values
		- Make mass update and create game modals submit by default when enter key is pressed like update does currently
		- Break out filtering logic into subfunction maybe?
		- Add ability to merge games
		- Re-apply filter on update?
		- Hide modal window when another is triggered
		- Re-applying filter fucks up ordering?
		- Can't deselect games that aren't in the current filter page
		- Add loading indicator when mass update modal is submitted
		- BUG: Sorting is screwy + filtering?
		- Clear selection should clear all selected games, not just ones on the current page
		- Update page when there are fewer total pages available (i.e. - current page if current page > max pages else max pages)
		- Allow read-only fields to be filled out if empty, otherwise readonly
	-->
	<body>
		<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
		  <div class="container">
			<div class="collapse navbar-collapse">
			  <ul class="nav navbar-nav left">
				<li data-bind="css: { active: activeTab() == 'home' }" ><a href="#home" data-bind="click: setActiveTab">Home</a></li>
				<li data-bind="css: { active: activeTab() == 'all' }" ><a href="#all" data-bind="click: setActiveTab">Show All</a></li>
			  </ul>
			  <ul class="nav navbar-nav right">
				<li class="pull-right search-container"><input autocomplete="off" placeholder="Search" title="Search" class="form-control search" type="text"><a class="clear-icon" href="#" data-bind="event: {focus: preventFocus}, click: clearSearch"><span class="glyphicon glyphicon-remove"></span></a></li>
				<li class="new-game-button-container pull-right"><button type="button" data-target="newgame" data-bind="click: triggerModal" class="form-control btn btn-primary">New Game</button></li>
			  </ul>
			  <div id="container"></div>
			</div><!--/.nav-collapse -->
		  </div>
		</div>

		<!-- Modal -->
		<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		  <div class="modal-dialog">

		    <div class="modal-content massupdate">
			    <div class="modal-header">
			        <button type="button" class="close" data-bind="click: hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title" id="myModalLabel">Mass Update</h4>
			    </div>
				<div class="modal-body">
					<div class="ajax-notice" data-bind="css: $root.messageClass, showMessage: $root.activeMessage()"></div>
					<form role="form-horizontal" data-bind="with: massUpdateData">
						<div class="form-group">
							<label for="source">Source</label>
							<input type="text" class="form-control" placeholder="Source" data-bind="value: source, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Platform</label>
							<input type="text" class="form-control" placeholder="Platform" data-bind="value: platform, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Purchased Date</label>
							<input type="text" class="form-control datepicker" placeholder="Purchase Date" data-bind="value: date_created, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Has Played</label>
							<input type="text" class="form-control" placeholder="Has Played" data-bind="value: has_played, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Has Finished</label>
							<input type="text" class="form-control" placeholder="Has Finished" data-bind="value: has_finished, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Playability Rating</label>
							<input type="text" class="form-control" placeholder="Playability Rating" data-bind="value: play_rating, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<h4><small>Input <strong>&lt;DELETE&gt;</strong> to set value to NULL, otherwise field is ignored</small></h4>
							<div class="clear"></div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-bind="click: cancelMassUpdate">Cancel</button>
					<button type="button" class="btn btn-primary" data-bind="click: massUpdate, text: 'Update ' + selectedGames().length + ' game(s)'"></button>
				</div>
		    </div>

			<div data-bind="with: newGame" class="modal-content newgame">
		      <div class="modal-header">
		        <button type="button" class="close" data-bind="click: $root.hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
		        <h4 class="modal-title" id="myModalLabel">Create New Game</h4>
		      </div>
		      <div class="modal-body">
				<div class="ajax-notice" data-bind="css: $root.messageClass, showMessage: $root.activeMessage()"></div>
		        <form role="form-horizontal">
						<div class="form-group">
							<label for="title">Title</label>
							<input type="text" class="form-control" placeholder="Title" data-bind="value: title, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="source">Source</label>
							<input type="text" class="form-control" placeholder="Source" data-bind="value: source, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Platform</label>
							<input type="text" class="form-control" placeholder="Platform" data-bind="value: platform, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Has Played</label>
							<input type="text" class="form-control" placeholder="Has Played" data-bind="value: has_played, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Source ID</label>
							<input type="text" class="form-control" placeholder="Source ID" data-bind="value: source_id, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
						</div>
					</form>
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-default" data-bind="click: $root.cancelCreateGame">Cancel</button>
		        <button type="button" class="btn btn-primary" data-bind="click: $root.createGame">Create Game</button>
		      </div>
		    </div>

			<div data-bind="with: currentGame" class="current-game modal-content editgame">
				<div class="modal-header">
			        <button type="button" class="close" data-bind="click: $root.hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title" id="myModalLabel">Edit Game</h4>
		      	</div>
		      	<div class="modal-body">
		      		<div class="ajax-notice" data-bind="css: $root.messageClass, showMessage: $root.activeMessage()"></div>
					<form role="form-horizontal">
						<div class="form-group">
							<label>Id</label>
							<input disabled="disabled" type="text" class="form-control" placeholder="Id" data-bind="value: id">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Title</label>
							<input type="text" class="form-control" placeholder="Title" data-bind="value: title, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Source</label>
							<input type="text" class="form-control" placeholder="Source" data-bind="value: source, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Platform</label>
							<input type="text" class="form-control" placeholder="Platform" data-bind="value: platform, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Purchased Date</label>
							<input type="text" class="form-control datepicker" placeholder="Purchase Date" data-bind="value: date_created, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Has Played</label>
							<input type="text" class="form-control" placeholder="Has Played" data-bind="value: has_played, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Has Finished</label>
							<input type="text" class="form-control" placeholder="Has Finished" data-bind="value: has_finished, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Playability Rating</label>
							<input type="text" class="form-control" placeholder="Playability Rating" data-bind="value: play_rating, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Source ID</label>
							<input disabled="disabled" type="text" class="form-control" placeholder="Source ID" data-bind="value: source_id">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Last Updated</label>
							<input disabled="disabled" type="text" class="form-control" placeholder="Last Updated" data-bind="value: date_updated">
							<div class="clear"></div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-danger" data-bind="click: $root.deleteGame">Delete</button>
			        <button type="button" class="btn btn-default" data-bind="click: $root.cancelUpdateGame">Cancel</button>
			        <button type="button" class="btn btn-primary" data-bind="click: $root.updateGame">Update</button>
		      </div>
			</div>

		  </div>
		</div>

		<div class="container">

		  <div class="starter-template">

			<div class="ajax-notice" data-bind="css: messageClass, showMessage: activeMessage()"></div>

			<div class="loading-indicator hidden" data-bind="visible: showLoading(), css: { hidden: false }" ><img src="img/ajax-loader.gif" /></div>

			<div class="home" data-bind="visible: activeTab() == 'home'">
				<div class="row">
					<div class="home-section col-md-5">To-Play Summary (show top 5, date added to list, "add note" button)</div>
					<div class="col-md-2"></div>
					<div class="home-section col-md-5">Useful Controls (add game button, and...?)</div>
				</div>
				<div class="row">
					<div class="home-section col-md-5">Recently Added</div>
					<div class="col-md-2"></div>
					<div class="home-section col-md-5">Bottom right (lol, what content goes here?)</div>
				</div>
			</div>

			<div class="all-games hidden" data-bind="visible: activeTab() == 'all', css: { hidden: false }">
				<div class="row table-meta">
					<div class="col-md-3 pagination-controls">
						<span class="page-label page-counter" data-bind="text: 'Page: ' + currentPageNo() + '/' + currentGameListTotalPages()"></span>
						<button data-bind="click: prevGameListPage" class="page-control glyphicon glyphicon-triangle-left"></button>
						<span class="page-label" data-bind="text: '(' + pageSize() + ' per page)'"></span>
						<button data-bind="click: nextGameListPage" class="page-control glyphicon glyphicon-triangle-right"></button>
					</div>
					<div class="col-md-5">
						<div class="slider-container">
							<div class="mass-actions">
								<button type="button" class="btn btn-danger" data-bind="click: massDelete, text: 'Delete ' + selectedGames().length + ' game(s)'"></button>
								<button type="button" class="btn btn-default" data-target="massupdate" data-bind="click: triggerModal">Mass Update</button>
								<button type="button" class="btn btn-default" data-bind="click: clearSelection">Clear Selection</button>
							</div>
						</div>
					</div>
					<div class="col-md-1 no_right_padding"><span class="num_results" data-bind="text: ko.unwrap(getAppropriateDataStore()).length + ' results'"></span></div>
					<div class="col-md-3 filter-container">
						<input autocomplete="off" placeholder="Filter (hit Enter when done)" title="Filter" class="form-control filter" type="text" data-bind="event: { keyup: applyFiltering }">
						<a class="clear-icon" href="#" data-bind="event: {focus: preventFocus}, click: clearFilter"><span class="glyphicon glyphicon-remove"></span></a>
					</div>
				</div>

				<div class="row thead">
					<div class="col-md-1 ctrls-column"></div>
					<div data-bind="click: updateSortingField" data-target="id" class="col-md-1">ID<span class="sorting-icon glyphicon"></span></div>
					<div data-bind="click: updateSortingField" data-target="title" class="col-md-5">Title<span class="sorting-icon glyphicon glyphicon-triangle-top"></span></div>
					<div data-bind="click: updateSortingField" data-target="source" class="col-md-2">Source<span class="sorting-icon glyphicon"></span></div>
					<div data-bind="click: updateSortingField" data-target="platform" class="col-md-2">Platform<span class="sorting-icon glyphicon"></span></div>
					<div class="col-md-1 select-all"><input type="checkbox" data-bind="checked: allSelectedOnPage, click: toggleSelectAll"></div>
				</div>

				<!-- ko foreach: currentPage -->
				<div class="row single-game">
					<div class="col-md-1">
						<span data-bind="click: $root.deleteGame" class="delete-ctrl glyphicon glyphicon-trash"></span>
						<span data-bind="click: $root.editGameFromList" class="edit-ctrl glyphicon glyphicon-pencil"></span>
					</div>
					<div class="col-md-1" data-bind="text: id"></div>
					<div class="col-md-5" data-bind="text: title"></div>
					<div class="col-md-2" data-bind="text: source"></div>
					<div class="col-md-2" data-bind="text: platform">Platform</div>
					<div class="col-md-1"><input type="checkbox" data-bind="checked: selected, click: $root.updateSelected "></div>
				</div>
				<!-- /ko -->

				<div data-bind="visible: currentPage() && currentPage().length == 0" class="row single-game">
					<div class="col-md-12">No titles matched your query</div>
				</div>

				<div class="row table-meta">
					<div class="col-md-3 pagination-controls">
						<span class="page-label" data-bind="text: 'Page: ' + currentPageNo() + '/' + currentGameListTotalPages()"></span>
						<button data-bind="click: prevGameListPage" class="page-control glyphicon glyphicon-triangle-left"></button>
						<span class="page-label" data-bind="text: '(' + pageSize() + ' per page)'"></span>
						<button data-bind="click: nextGameListPage" class="page-control glyphicon glyphicon-triangle-right"></button>
					</div>
					<div class="col-md-8"></div>
				</div>
			</div>


		  </div>

		</div><!-- /.container -->

		<!-- Bootstrap core JavaScript
		================================================== -->
		<!-- Placed at the end of the document so the pages load faster -->
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
		<script src="js/bootstrap.min.js"></script>
		<!--<script src="js/knockout-3.3.0.min.js"></script>-->
		<script src="js/knockout-3.3.0.debug.js"></script>
		<script src="js/knockout.mapping-latest.js"></script>
		<!--<script src="js/typeahead-0.10.5.js"></script>-->
		<script src="js/jquery-ui.min.js"></script>
		<script src="js/bootstrap-datepicker.min.js"></script>

		<!-- Other jQuery Plugins/Libraries -->

		<script src="js/custom.js"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>