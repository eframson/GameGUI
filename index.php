<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<meta http-equiv="X-UA-Compatible" content="IE=edge">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<meta name="description" content="">
		<meta name="author" content="">
		<!--<link rel="icon" href="../../favicon.ico">-->
		<title>Bootstrap 101 Template</title>

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
	<body>
		<div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
		  <div class="container">
			<div class="navbar-header">
			  <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target=".navbar-collapse">
				<span class="sr-only">Toggle navigation</span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
				<span class="icon-bar"></span>
			  </button>
			  <a class="navbar-brand" href="#">Project name</a>
			</div>
			<div class="collapse navbar-collapse">
			  <ul class="nav navbar-nav">
				<li class="active"><a href="#">Home</a></li>
				<li class=""><a href="#">TODO: Show all</a></li>
				<!--<li><a href="#about">About</a></li>
				<li><a href="#contact">Contact</a></li>-->
			  </ul>
			  <input autocomplete="off" placeholder="Search" title="Search" class="form-control search" type="text">
			  <div id="container"></div>
			</div><!--/.nav-collapse -->
		  </div>
		</div>

		<div class="container">

		  <div class="starter-template">
			<!--<h1>Bootstrap starter template</h1>
			<p class="lead">Use this document as a way to quickly start any new project.<br> All you get is this text and a mostly barebones HTML document.</p>-->
			<div class="ajax-notice bg-success" data-bind="showSuccess: mostRecentAjaxSuccess()"></div>
			<div class="ajax-notice bg-danger" data-bind="showFailure: mostRecentAjaxFailure()"></div>
			<div data-bind="showEditPanel: currentGameId, with: currentGame" class="current-game">				
				<form role="form-horizontal">
					<div class="form-group current-game-form">
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
					<!-- <div class="form-group">
						<label for="exampleInputPassword1">Password</label>
						<input type="password" class="form-control" id="exampleInputPassword1" placeholder="Password">
					</div>
					<div class="form-group">
						<label for="exampleInputFile">File input</label>
						<input type="file" id="exampleInputFile">
						<p class="help-block">Example block-level help text here.</p>
					</div>
					<div class="checkbox">
						<label><input type="checkbox"> Check me out</label>
					</div> -->
					<div class="button-controls">
						<button type="button" class="btn btn-danger" data-bind="click: $parent.deleteGame">Delete</button>
						<button type="button" class="btn btn-default" data-bind="click: $parent.updateGame">Submit</button>
					</div>
				</form>
				
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
		<!--<script src="js/typeahead-0.10.5.js"></script>-->
		<script src="js/jquery-ui.min.js"></script>
		<script src="js/custom.js"></script>
		<!-- IE10 viewport hack for Surface/desktop Windows 8 bug -->
		<!--<script src="js/ie10-viewport-bug-workaround.js"></script>-->
	</body>
</html>