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

		<!-- Select2 -->
		<link href="css/select2.min.css" rel="stylesheet">

		<!-- jQuery Growl -->
		<link href="css/jquery.growl.css" rel="stylesheet">
				
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
		
		NEW FEATURES
		- To-play list management tab + mini-display on frontend (field: to_play_order)
		- Add "dump" button to output a JSON version of all games (to make cross-system backup compares easier)
		- Notes box on homepage
		- Preferences tab/UI (# per page, etc.)
		- Show a user-friendly string translation of the filter string
			IDEA:
				ALL of the following must be true:
					- source HAS steam
					- title HAS sam
				AT LEAST ONE of the following must be true:
					- playability_rating EQUALS 4
		- Store page number separately for filtered vs non-filtered results (?)
		- Add UI for setting source-specific third party IDs (this is kind of an edge-ish case so I'm not worrying about it for now)

		GUI IMPROVEMENTS
		- third_party_id is now in a different table; How do we display/allow for editing?
		- Prevent entire page from moving down when AJAX message is displayed
		- Make single-game update success message unique from mass update
		- Allow read-only fields to be filled out if empty, otherwise readonly
		- Show loader icon in homepage sections while content is loading
		- Re-sort list on partially successful mass update
		- Add loading indicator when mass update modal is submitted
		- Update/expand filter syntax instructions
		- Add blue highlights to "pencil" edit button, and red highlighting to trash can icon
		- Show "no results found" if top-level search bar returns nothing
		- Come up with better system to see if we're still loading (use the ajax request counter)
		- Make filtering work with new platform/source format
		- Get datepicker working with created/updated dates
		- Clear out mass-update array of data after successful submission?

		CODE IMPROVEMENTS
		- Clean up tab display logic
		- Give better names to functions involved in filtering process
		- Make single/double quotes + camelcase/underscores consistent
		- Find better way of implementing PHP require_onces() (don't use assumed DOCUMENT_ROOT path)
		- Don't use !important for select2 widths
		- Put code to generate platforms_for_render + sources_for_render in one re-callable function
		- See if select2 code can be put in a re-callable function
		
		BUGS
		- Modal window does not hide properly when it is merely clicked-outside-of (rather than canceled or closed)
		- Filter changes when you backspace after searching?
		- Tab-switching fields doesn't work for select2 fields

	-->
	<body>
		<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
		  <div class="container">
			<div class="collapse navbar-collapse">
			  <ul class="nav navbar-nav left">
				<li data-bind="css: { active: activeTab() == 'home' }" ><a href="#home" data-bind="click: setActiveTab">Home</a></li>
				<li data-bind="css: { active: activeTab() == 'all' }" ><a href="#all" data-bind="click: setActiveTab">Show All</a></li>
			  </ul><!--/.navbar-nav .left-->
			  <ul class="nav navbar-nav right">
				<li class="pull-right search-container">
					<input autocomplete="off" placeholder="Search" title="Search" class="form-control search" type="text"/>
					<a class="clear-icon" href="#" data-bind="event: {focus: preventFocus}, click: clearSearch">
						<span class="glyphicon glyphicon-remove"></span>
					</a>
					<div class="search-results-container"></div>
				</li>
				<li class="new-game-button-container pull-right"><button type="button" data-target="newgame" data-bind="click: triggerModal" class="form-control btn btn-primary">New Game</button></li>
			  </ul><!--/.navbar-nav .right-->

			</div><!--/.nav-collapse -->
		  </div>
		</div>

		<!-- start Modals section -->
		<div class="modal fade" id="myModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
		  <div class="modal-dialog">

		    <div class="modal-content massupdate">
			    <div class="modal-header">
			        <button type="button" class="close" data-bind="click: hideModalIfShown"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title">Mass Update</h4>
			    </div>
				<div class="modal-body">
					<form role="form-horizontal" data-bind="with: massUpdateData">
						<div class="form-group">
							<label>Source</label>
							<select class="form-control source" data-bind="options: $root.sourcesDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: sources" multiple="multiple"></select>
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Platform</label>
							<select class="form-control platform" data-bind="options: $root.platformsDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: platforms" multiple="multiple"></select>
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
							<label for="platform">Open Ended</label>
							<input type="text" class="form-control" placeholder="Open Ended" data-bind="value: open_ended, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Notes</label>
							<input type="text" class="form-control" placeholder="Notes" data-bind="value: notes, event: { keyup: $root.massUpdateOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<h4><small>Input <strong>&lt;DELETE&gt;</strong> to set value to NULL, otherwise field is ignored</small></h4>
							<div class="clear"></div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-default" data-bind="click: hideModalIfShown">Cancel</button>
					<button type="button" class="btn btn-primary" data-bind="click: massUpdate, text: 'Update ' + selectedGames().length + ' game(s)'"></button>
				</div>
		    </div>

			<div data-bind="with: newGame" class="modal-content newgame">
		      <div class="modal-header">
		        <button type="button" class="close" data-bind="click: $root.hideModalIfShown"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
		        <h4 class="modal-title">Create New Game</h4>
		      </div>
		      <div class="modal-body">
		        <form role="form-horizontal">
						<div class="form-group search-container">
							<label for="title">Title</label>
							<input type="text" class="form-control search" placeholder="Title" data-bind="value: title, event: { keyup: $root.createGameOnEnter }">
							<div class="clear"></div>
							<div class="search-results-container"></div>
						</div>
						<div class="form-group">
							<label>Source</label>
							<select class="form-control source" data-bind="options: $root.sourcesDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: sources" multiple="multiple"></select>
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Platform</label>
							<select class="form-control platform" data-bind="options: $root.platformsDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: platforms" multiple="multiple"></select>
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
		        <button type="button" class="btn btn-default" data-bind="click: $root.hideModalIfShown">Cancel</button>
		        <button type="button" class="btn btn-primary" data-bind="click: $root.createGame">Create Game</button>
		      </div>
		    </div>

			<div data-bind="with: currentGame" class="current-game modal-content editgame">
				<div class="modal-header">
			        <button type="button" class="close" data-bind="click: $root.hideModalIfShown"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title">Edit Game</h4>
		      	</div>
		      	<div class="modal-body">
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
							<select class="form-control source" data-bind="options: $root.sourcesDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: sources" multiple="multiple"></select>
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label>Platform</label>
							<select class="form-control platform" data-bind="options: $root.platformsDataStore, optionsText: 'name', optionsValue: 'id', selectedOptions: platforms" multiple="multiple"></select>
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
						<div class="form-group">
							<label for="platform">Open Ended</label>
							<input type="text" class="form-control" placeholder="Open Ended" data-bind="value: open_ended, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">Notes</label>
							<input type="text" class="form-control" placeholder="Notes" data-bind="value: notes, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
						<div class="form-group">
							<label for="platform">To Play Order</label>
							<input type="text" class="form-control" placeholder="To Play Order" data-bind="value: to_play_order, event: { keyup: $root.updateGameOnEnter }">
							<div class="clear"></div>
						</div>
					</form>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-danger" data-bind="click: $root.deleteGame">Delete</button>
			        <button type="button" class="btn btn-default" data-bind="click: $root.hideModalIfShown">Cancel</button>
			        <button type="button" class="btn btn-primary" data-bind="click: $root.updateGame">Update</button>
		      </div>
			</div>

			<div class="modal-content filter-instructions">
			    <div class="modal-header">
			        <button type="button" class="close" data-bind="click: hideModalIfShown"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title">How To Use Filters</h4>
			    </div>
				<div class="modal-body">
					<p>Some examples:</p>
					<table class="table">
					<tr>
						<td>source=steam</td>
						<td>return all games that contain "steam" somewhere in their source</td>
					</tr>
						<td>source=steam AND title=sam</td>
						<td>return all games that contain "steam" somewhere in the source AND that contain "sam" in the title</td>
					</tr>
					</tr>
						<td>source=steam OR source=gog</td>
						<td>return all games that contain "steam" somewhere in the source OR that contain "gog" in the source</td>
					</tr>
					</tr>
						<td>title=sam OR source=steam OR source=gog</td>
						<td>return all games that contain "sam" in the title OR that contain "steam" in the source OR that contain "gog" in the source</td>
					</tr>
					</tr>
						<td>source=NULL</td>
						<td>return all games where source is not set</td>
					</tr>
					</tr>
						<td>source=EMPTY</td>
						<td>return all games where source is an empty string, i.e. - ''</td>
					</tr>
					</table>

					<p>Notes:</p>
					<ul>
						<li>Keywords (AND, OR) are CASE SENSITIVE</li>
						<li>Keywords must be followed and preceded by a single space</li>
						<li>Operators (=) must not be followed by any spacing</li>
						<li>Match values are case insensitive</li>
						<li>If multiple filters are given with AND &amp; OR, the very first term will implicitly have the keyword of the filter immediately following it (e.g. - title=foo AND source=bar will only return results that have a title containing 'foo' and a title containing 'bar'. title=foo OR source=bar will return results that have a title containing 'foo' OR a source containing 'bar'</li>
					</ul>

				</div>
				<!--<div class="modal-footer">
				</div>-->
		    </div>

			<div class="modal-content mass-merge">
			    <div class="modal-header">
			        <button type="button" class="close" data-bind="click: hideModalIfShown"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>
			        <h4 class="modal-title">Merge Games</h4>
			    </div>
				<form id="massUpdateValues">
					<div class="modal-body">
						<p>Choose what field values the resulting merged game will have:</p>
							<div data-bind="foreach: $root.massMergeFields()">
								<div class="merge-field">
									<h4 data-bind="text: label"></h4>
									<!-- ko foreach: options -->
										<div>
											<input type="radio" data-bind="attr: { name: $parent.name, checked: ( $parent.name != 'id' && value == 'NULL' ) ? 'checked' : false, id: id }, value: value"/>
											<label data-bind="attr: { for: id }, text: label"></label>
										</div>
									<!-- /ko -->
									<div data-bind="visible: showFillIn == true">
										<input class="merge-fill-in" type="radio" data-bind="attr: { name: name, id: name + '-other' } , value: name + '-other'"/>
										<!-- ko if: name != 'sources' && name != 'platforms' -->
											<input type="text" class="form-control merge-fill-in" placeholder="Other" data-bind='attr: { name: name + "-other" }, click: $root.selectPrecedingRadioButton'/>
										<!-- /ko -->
										<!-- ko if: name == 'platforms' -->
											<select class="form-control platform" data-bind="attr: { name: name + '-other' }, options: $root.platformsDataStore, optionsText: 'name', optionsValue: 'id'" multiple="multiple"></select>
										<!-- /ko -->
										<!-- ko if: name == 'sources' -->
											<select class="form-control source" data-bind="attr: { name: name + '-other' }, options: $root.sourcesDataStore, optionsText: 'name', optionsValue: 'id'" multiple="multiple"></select>
										<!-- /ko -->
										<div class="clear"></div>
									</div>
								</div>
							</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-default" data-bind="click: hideModalIfShown">Cancel</button>
						<button type="button" class="btn btn-primary" data-bind="click: massMerge, text: 'Merge ' + selectedGames().length + ' game(s)'"></button>
					</div>
				</form>
		    </div>
		    <!-- end Modals section -->


		  </div>
		</div>

		<div class="container">

		  <div class="starter-template">

			<div class="loading-indicator hidden" data-bind="visible: showLoading(), css: { hidden: false }" ><img src="img/ajax-loader.gif" /></div>

			<div class="home" data-bind="visible: activeTab() == 'home'">
				<div class="row">
					<div class="home-section col-md-5 to-play">
						<h4>To-Play List</h4>
						<div>
							<span class="title-header">Title</span>
							<span class="order-header">Order</span>
							<div class="clear"></div>
						</div>
						<div data-bind="foreach: topFiveGamesToPlay">
							<div>
								<span class="title" data-bind="text: title, click: $root.doEditGame"></span>
								<span class="order" data-bind="text: to_play_order"></span>
								<div class="clear"></div>
							</div>
						</div>
					</div>
					<div class="col-md-2"></div>
					<div class="home-section col-md-5 unplayed-games">
						<h4>Unplayed Games</h4>
						<div>
							<span class="title-header">Title</span>
							<span class="date-header">Date Added</span>
							<div class="clear"></div>
						</div>
						<div data-bind="foreach: unplayedGames">
							<div>
								<span class="title" data-bind="text: title, click: $root.doEditGame"></span>
								<span class="date" data-bind="text: date_created"></span>
								<div class="clear"></div>
							</div>
						</div>
					</div>
				</div>
				<div class="row">
					<div class="home-section col-md-5 recently-added">
						<h4>Recently Added</h4>
						<div>
							<span class="title-header">Title</span>
							<span class="date-header">Date Added</span>
							<div class="clear"></div>
						</div>
						<div data-bind="foreach: recentlyAddedGames">
							<div>
								<span class="title" data-bind="text: title, click: $root.doEditGame"></span>
								<span class="date" data-bind="text: date_created"></span>
								<div class="clear"></div>
							</div>
						</div>
					</div>
					<div class="col-md-2"></div>
					<div class="home-section col-md-5 incomplete-data">
						<h4>Incomplete Information</h4>
						<div>
							<span class="title-header">Title</span>
							<span class="date-header">Date Added</span>
							<div class="clear"></div>
						</div>
						<div data-bind="foreach: incompleteDataGames">
							<div>
								<span class="title" data-bind="text: title, click: $root.doEditGame"></span>
								<span class="date" data-bind="text: date_created"></span>
								<div class="clear"></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div class="all-games hidden" data-bind="visible: activeTab() == 'all', css: { hidden: false }">
				<div class="row table-meta">
					<div class="col-md-3 pagination-controls">
						<span class="page-label page-counter" data-bind="text: 'Page: ' + currentPageNo() + '/' + currentGameListTotalPages()"></span>
						<button data-bind="click: firstGameListPage" class="page-control glyphicon glyphicon-step-backward first-page"></button>
						<button data-bind="click: prevGameListPage" class="page-control glyphicon glyphicon-triangle-left prev-page"></button>
						<span class="page-label" data-bind="text: '( < ' + pageSize() + ' per page)'"></span>
						<button data-bind="click: nextGameListPage" class="page-control glyphicon glyphicon-triangle-right next-page"></button>
						<button data-bind="click: lastGameListPage" class="page-control glyphicon glyphicon-step-forward last-page"></button>
					</div>
					<div class="col-md-5">
						<div class="slider-container">
							<div class="mass-actions">
								<button type="button" class="btn btn-danger" data-bind="click: massDelete, text: 'Delete ' + selectedGames().length + ' game(s)'"></button>
								<button type="button" class="btn btn-default" data-target="massupdate" data-bind="click: triggerModal">Mass Update</button>
								<button type="button" class="btn btn-default" data-bind="click: clearSelection">Clear Selection</button>
								<div class="dropdown">
									<button id="show-extra-mass-opts" type="button" class="btn btn-default glyphicon glyphicon-th-list show-extra-mass-opts" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-bind="visible: selectedGames().length > 1"></button>
									<ul class="dropdown-menu" role="menu" aria-labelledby="show-extra-mass-opts">
										<li role="presentation" class="dropdown-header">Other Actions</li>
										<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-target="mass-merge" data-bind="click: triggerModal">Merge Games</a></li>
									</ul>
								</div>
							</div>
						</div>
					</div>
					<div class="col-md-1 no_right_padding"><span class="num_results" data-bind="text: ko.unwrap(getAppropriateDataStore()).length + ' results'"></span></div>
					<div class="col-md-3 filter-container">
						<a class="show-info-icon" href="#" data-bind="event: {focus: preventFocus}, click: showFilterInfoPopup"><span class="glyphicon glyphicon-question-sign"></span></a>
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
					<div class="col-md-1 ctrl-icons">
						<span data-bind="click: $root.deleteGame" class="delete-ctrl glyphicon glyphicon-trash"></span>
						<span data-bind="click: $root.editGameFromList" class="edit-ctrl glyphicon glyphicon-pencil"></span>
					</div>
					<div class="col-md-1" data-bind="text: id"></div>
					<div class="col-md-5" data-bind="text: title"></div>
					<div class="col-md-2" data-bind="text: sources_for_render"></div>
					<div class="col-md-2" data-bind="text: platforms_for_render"></div>
					<div class="col-md-1"><input type="checkbox" data-bind="checked: selected, click: $root.updateSelected "></div>
				</div>
				<!-- /ko -->

				<div data-bind="visible: currentPage() && currentPage().length == 0" class="row single-game">
					<div class="col-md-12">No titles matched your query</div>
				</div>

				<div class="row table-meta">
					<div class="col-md-3 pagination-controls">
						<span class="page-label page-counter" data-bind="text: 'Page: ' + currentPageNo() + '/' + currentGameListTotalPages()"></span>
						<button data-bind="click: firstGameListPage" class="page-control glyphicon glyphicon-step-backward first-page"></button>
						<button data-bind="click: prevGameListPage" class="page-control glyphicon glyphicon-triangle-left prev-page"></button>
						<span class="page-label" data-bind="text: '( < ' + pageSize() + ' per page)'"></span>
						<button data-bind="click: nextGameListPage" class="page-control glyphicon glyphicon-triangle-right next-page"></button>
						<button data-bind="click: lastGameListPage" class="page-control glyphicon glyphicon-step-forward last-page"></button>
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
		<script src="js/jquery.caret.min.js"></script>
		<script src="js/select2.min.js"></script>
		<script src="js/jquery.growl.js"></script>

		<!-- Other jQuery Plugins/Libraries -->

		<script src="js/custom.js"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>