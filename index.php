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
		- Make search bar look through local data store instead of querying each time
		- Put in some content in "home" so one tab's content can be easily distinguished from another
		- Make Cmd/Ctrl + F a shortcut for search rather than default Chrome/FF functionality
		- Implement per-page select all + actual select all functionality
		- Add "X" icon to filter box so results can be easily cleared
		- Make pagination control width/spacing static so page # doesn't vary spacing
		- Add per-page "select all" functionality

		- BUG: Adding game from the homepage displays "Show All page"
	-->
	<body>
		<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
		  <div class="container">
			<div class="collapse navbar-collapse">
			  <ul class="nav navbar-nav">
				<li class="" data-bind="css { active: activeTab() == 'home' }" ><a href="#home" data-bind="click: setActiveTab">Home</a></li>
				<li class="" data-bind="css { active: activeTab() == 'all' }"><a href="#all" data-bind="click: setActiveTab">Show All</a></li>
				<li class="pull-right"><input autocomplete="off" placeholder="Search" title="Search" class="form-control search" type="text"></li>
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
		        <form role="form-horizontal" data-bind="with: massUpdateData">
					<div class="form-group">
						<label for="source">Source</label>
						<input type="text" class="form-control" id="edit_source" placeholder="Source" data-bind="value: source">
						<div class="clear"></div>
					</div>
					<div class="form-group">
						<label for="platform">Platform</label>
						<input type="text" class="form-control" id="edit_platform" placeholder="Platform" data-bind="value: platform">
						<div class="clear"></div>
					</div>
				</form>
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-default" data-bind="click: hideModal">Cancel</button>
		        <button type="button" class="btn btn-primary" data-bind="click: massUpdate, text: 'Update ' + selectedGames().length + ' game(s)'"></button>
		      </div>
		    </div>

			<div data-bind="with: newGame" class="modal-content newgame">
		      <div class="modal-header">
		        <button type="button" class="close" data-bind="click: $root.hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
		        <h4 class="modal-title" id="myModalLabel">Create New Game</h4>
		      </div>
		      <div class="modal-body">
		        <form role="form-horizontal">
						<div class="form-group">
							<label for="title">Title</label>
							<input type="text" class="form-control" placeholder="Title" data-bind="value: title">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="source">Source</label>
							<input type="text" class="form-control" placeholder="Source" data-bind="value: source">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Platform</label>
							<input type="text" class="form-control" placeholder="Platform" data-bind="value: platform">
							<div class="clear"></div>
						</div>
					</form>
		      </div>
		      <div class="modal-footer">
		        <button type="button" class="btn btn-default" data-bind="click: $root.hideModal">Cancel</button>
		        <button type="button" class="btn btn-primary" data-bind="click: $root.createGame">Create Game</button>
		      </div>
		    </div>

			<div data-bind="with: currentGame" class="current-game modal-content editgame">
				<div class="modal-header">
			        <button type="button" class="close" data-bind="click: $root.hideModal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title" id="myModalLabel">Edit Game</h4>
		      	</div>
		      	<div class="modal-body">
					<form role="form-horizontal">
						<div class="form-group">
							<label for="id">Id</label>
							<input disabled="disabled" type="text" class="form-control" id="edit_id" placeholder="Id" data-bind="value: id">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="title">Title</label>
							<input type="text" class="form-control" id="edit_title" placeholder="Title" data-bind="value: title">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="source">Source</label>
							<input type="text" class="form-control" id="edit_source" placeholder="Source" data-bind="value: source">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Platform</label>
							<input type="text" class="form-control" id="edit_platform" placeholder="Platform" data-bind="value: platform">
							<div class="clear"></div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-danger" data-bind="click: $root.deleteGameFromModal">Delete</button>
			        <button type="button" class="btn btn-default" data-bind="click: $root.hideModal">Cancel</button>
			        <button type="button" class="btn btn-primary" data-bind="click: $root.updateGame">Update</button>
		      </div>
			</div>

		  </div>
		</div>

		<div class="container">

		  <div class="starter-template">

			<div class="ajax-notice bg-success" data-bind="showSuccess: mostRecentAjaxSuccess()"></div>
			<div class="ajax-notice bg-danger" data-bind="showError: mostRecentAjaxFailure()"></div>

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
						<span class="page-label" data-bind="text: 'Page: ' + currentPageNo() + '/' + currentGameListTotalPages()"></span>
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
					<div class="col-md-1"></div>
					<div class="col-md-3 filter-container">
						<input autocomplete="off" placeholder="Filter (hit Enter when done)" title="Filter" class="form-control filter" type="text" data-bind="event: { keyup: applyFiltering }">
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
						<span data-bind="click: $root.deleteGameFromList" class="delete-ctrl glyphicon glyphicon-trash"></span>
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
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
		<script src="js/bootstrap.min.js"></script>
		<script src="js/knockout-3.2.0.min.js"></script>
		<!--<script src="js/knockout-3.2.0.debug.js"></script>-->
		<!--<script src="js/typeahead-0.10.5.js"></script>-->
		<script src="js/jquery-ui.min.js"></script>

		<!-- Other jQuery Plugins/Libraries -->

		<script src="js/custom.js"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>