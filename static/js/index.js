(function ($) {
  'use strict';

  var $canvas = $('#game-canvas');

  var LightenDarkenColor = function (col, amt) {
    var usePound = false;

    if (col[0] == "#") {
      col = col.slice(1);
      usePound = true;
    }

    var num = parseInt(col, 16);
    var r = (num >> 16) + amt;

    if (r > 255) r = 255;
    else if (r < 0) r = 0;

    var b = ((num >> 8) & 0x00FF) + amt;

    if (b > 255) b = 255;
    else if (b < 0) b = 0;

    var g = (num & 0x0000FF) + amt;

    if (g > 255) g = 255;
    else if (g < 0) g = 0;

    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16);
  };

  var UIManager = {
    updateLevelLabel: function() {
      $('#level-name').find('.value').text(levelManager.currentLevel + 1);
    },

    updateMoves: function () {
      $('#score-container').find('.moves').find('.value').text(levelManager.currentMoves);
    },

    updateTime: function () {
      $('#score-container').find('.time').find('.value').text(levelManager.currentElapsed);
    }
  };

  var canvasManager = {
    startNode: '',
    selectedNodeColor: '',
    selectedBlock: '',
    possibleMoves: [],

    hoverOn: function(layer) {
      layer.fillStyle = layer.data.lightColor;
      if (layer.name.startsWith('node-')) {
        canvasManager.hoverOn($canvas.getLayer(layer.name.replace('node', 'block')));
      }
    },

    hoverOff: function(layer) {
      layer.fillStyle = layer.data.color;
      if (layer.name.startsWith('node-')) {
        canvasManager.hoverOff($canvas.getLayer(layer.name.replace('node', 'block')));
      }
    },

    getPossibleMoves: function(x, y) {
      var potentialMoves = [];
      if (y >= 120) {
        potentialMoves.push('block-' + (y - 120) + x);
      }
      if ((y + 120) <= 480) {
        potentialMoves.push('block-' + (y + 120) + x);
      }
      if (x >= 120) {
        potentialMoves.push('block-' + y + (x - 120));
      }
      if ((x + 120) <= 480) {
        potentialMoves.push('block-' + y  + (x + 120));
      }

      return potentialMoves.filter(function(move) {
        var block = $canvas.getLayer(move);
        if (block.data.selected) {
          return block.data.color === canvasManager.selectedNodeColor;
        } else if (block.data.nodeBlock) {
          return block.data.nodeBlockColor === canvasManager.selectedNodeColor;
        }
        return !block.data.selected;
      });
    },

    resetPath: function(color) {
      var nodeGroup = $canvas.getLayerGroup('node-' + color);
      var pathBlocks = $canvas.getLayerGroup('blocks');
      pathBlocks.forEach(function(block) {
        if ($.inArray('b-' + color, block.groups) !== -1) {
          canvasManager.resetBlock(block);
        }
      });
      nodeGroup.forEach(function(node) {
        node.data.used = false;
      });

      if (canvasManager.possibleMoves) {
        canvasManager.possibleMoves.forEach(function(move) {
          canvasManager.resetBlock(move);
        });
      }

      canvasManager.possibleMoves = [];
      canvasManager.startNode = '';
      canvasManager.selectedBlock = '';
      canvasManager.selectedNodeColor = '';
    },

    nodeClick: function(layer) {
      if (canvasManager.selectedNodeColor === layer.data.color) {
        var nodeBlock = $canvas.getLayer(layer.name.replace('node', 'block'));
        if (nodeBlock.click !== undefined) {
          canvasManager.blockClick(nodeBlock);
          layer.data.used = true;
        }

        if (layer.name === canvasManager.startNode) {
          canvasManager.resetPath(layer.data.color);
        }
      } else if (!canvasManager.selectedNodeColor) { // A line is not already being drawn
        levelManager.currentMoves += 1;
        UIManager.updateMoves();

        var nodeGroup = $canvas.getLayerGroup('node-' + layer.data.color);
        var completed = nodeGroup.filter(function (node) {
          return node.data.used === true;
        });

        if (completed.length === 2) {
          levelManager.nodeReset();
          canvasManager.resetPath(layer.data.color);
          return;
        }

        canvasManager.startNode = layer.name;
        canvasManager.selectedNodeColor = layer.data.color;
        layer.data.used = true;

        var block = $canvas.getLayer('block-' + (layer.y - 60) + (layer.x - 60));

        block.fillStyle = layer.data.color;
        block.data.color = layer.data.color;
        block.data.lightColor = layer.data.lightColor;
        block.data.selected = true;

        canvasManager.selectedBlock = block.name;
        canvasManager.possibleMoves = canvasManager.getPossibleMoves(block.x, block.y);

        canvasManager.updatePossibleMoves();
      }

      $canvas.drawLayers();
    },

    nodeBlockClick: function(layer) {
      var node = $canvas.getLayer(layer.name.replace('block', 'node'));
      canvasManager.nodeClick(node);
    },

    resetBlock: function(block, full) {
      if ((typeof block) === 'string') {
        block = $canvas.getLayer(block);
      }
      block.click = undefined;
      block.fillStyle = '#000';
      block.mouseover = canvasManager.hoverOn;
      block.mouseout = canvasManager.hoverOff;
      block.data.selected = false;
      block.data.color = '#000';
      var groups =['blocks', 'board'];
      if (block.data.nodeBlock) {
        if (full) {
          block.data.nodeBlock = false;
        } else {
          block.click = canvasManager.nodeBlockClick;
          groups = block.groups;
        }
      }
      block.groups = groups;
      block.data.lightColor = LightenDarkenColor('#000', 60);
    },

    setBlock: function(layer) {
      var block = $canvas.getLayer(layer);
      block.click = undefined;
      block.mouseover = canvasManager.hoverOn;
      block.mouseout = canvasManager.hoverOff;
    },

    blockClick: function(layer) {
      if (layer.name === canvasManager.selectedBlock) {
        return;
      }

      if (canvasManager.selectedBlock) {
        canvasManager.setBlock(canvasManager.selectedBlock);
      }

      if (layer.data.selected) {
        canvasManager.resetBlock(canvasManager.selectedBlock);
      }

      levelManager.currentMoves += 1;
      UIManager.updateMoves();

      layer.fillStyle = canvasManager.selectedNodeColor;
      layer.data.color = canvasManager.selectedNodeColor;
      layer.data.lightColor = LightenDarkenColor(canvasManager.selectedNodeColor, 60);

      layer.data.selected = true;
      layer.groups.push('b-' + canvasManager.selectedNodeColor);
      layer.click = undefined;

      canvasManager.possibleMoves.forEach(function (move) {
        if (move !== layer.name) {
          var block = $canvas.getLayer(move);
          if (!block.data.selected) {
            canvasManager.resetBlock(block);
          } else {
            block.click = undefined;
            block.fillStyle = block.data.color;
            block.mouseover = canvasManager.hoverOn;
            block.mouseout = canvasManager.hoverOff;
          }
        }
      });

      if (layer.data.nodeBlock) {
        var nodeName = layer.name.replace('block', 'node');
        var node = $canvas.getLayer(nodeName);

        if (!node.data.used) {
          canvasManager.setBlock(layer);
          node.data.used = true;
          canvasManager.possibleMoves = [];
          canvasManager.startNode = '';
          canvasManager.selectedBlock = '';
          canvasManager.selectedNodeColor = '';

          levelManager.nodeComplete();

          $canvas.drawLayers();
          return;
        }
      }
      canvasManager.selectedBlock = layer.name;
      canvasManager.possibleMoves = canvasManager.getPossibleMoves(layer.x, layer.y);
      canvasManager.updatePossibleMoves();
      $canvas.drawLayers();
    },

    updatePossibleMoves: function() {
      canvasManager.possibleMoves.forEach(function(move) {
        var block = $canvas.getLayer(move);

        block.fillStyle = block.data.lightColor;
        block.click = canvasManager.blockClick;
        block.mouseover = undefined;
        block.mouseout = undefined;
      });
    },

    drawRect: function(x, y, width, height, color, name, groups, fromCenter) {
      fromCenter = (fromCenter === undefined) ? true : fromCenter;
      var opts = {
        strokeStyle: '#FFF',
        strokeWidth: 2,
        fillStyle: color,
        x: x, y: y,
        width: width,
        height: height,
        layer: true,
        name: name,
        groups: groups,
        fromCenter: fromCenter,
        data: {
          color: color,
          lightColor: LightenDarkenColor(color, 60),
          nodeBlock: false
        }
      };

      if (name.startsWith('block-')) {
        opts.mouseover = this.hoverOn;
        opts.mouseout = this.hoverOff;
      }

      $canvas.drawRect(opts);
    },

    drawCircle: function(x, y, radius, color, name, groups) {
      var opts = {
        fillStyle: color,
        strokeStyle: '#000',
        strokeWidth: 2,
        x: x, y: y,
        radius: radius,
        layer: true,
        name: name,
        groups: groups,
        data: {
          color: color,
          lightColor: LightenDarkenColor(color, 60)
        }
      };

      if (name.startsWith('node-')) {
        opts.mouseover = this.hoverOn;
        opts.mouseout = this.hoverOff;
        opts.click = this.nodeClick;
        opts.used = false;
      }
      $canvas.drawArc(opts);
    }
  };

  var levelManager = {
    paused: false,
    levelStats: [],

    totalStart: -1,
    totalTime: 0,
    totalElapsed: 0,

    currentStart: -1,
    currentTime: 0,
    currentElapsed: 0,
    // Level specific variables
    currentLevel: 0,
    currentMoves: 0,
    currentResets: 0,
    completedNodeGroups: 0,
    totalLevelNodeGroups: 0,
    finishedLevel: false,
    // Red, Blue, Green, Purple, Orange
    colors: ['#ff2323', '#3585e8', '#11c157', '#ed45c6', '#d35400'],

    setupLevel: function() {
      $canvas.removeLayerGroup('nodes');
      $canvas.setLayerGroup('win-screen', {visible: false});
      this.resetLevel(true);

      this.currentResets = 0;
      this.currentTime = 0;
      this.currentMoves = 0;
      this.completedNodeGroups = 0;
      this.finishedLevel = false;

      var levelData = levels[this.currentLevel];

      this.totalLevelNodeGroups = levelData.length;
      
      levelData.forEach(function(nodes, index) {
        for (var i=0; i < nodes.length; i++) {
          var x = nodes[i][0];
          var y = nodes[i][1];
          var layerName = 'node-' + (y - 60) + (x - 60);
          canvasManager.drawCircle(x, y, 25, levelManager.colors[index], layerName, ['nodes', 'board', 'node-' + levelManager.colors[index]]);
          $canvas.moveLayer(layerName, 25);
          var block = $canvas.getLayer(layerName.replace('node', 'block'));
          block.click = canvasManager.nodeBlockClick;
          block.data.nodeBlock = true;
          block.data.nodeBlockColor = levelManager.colors[index];
          block.groups.push('b-' + levelManager.colors[index]);
        }
      });

      if (this.totalStart === -1) {
        this.totalStart = new Date().getTime();
        window.setTimeout(levelManager.globalTimerInstance, 100);
      }

      this.currentStart = new Date().getTime();
      window.setTimeout(levelManager.levelTimerInstance, 100);

      $canvas.drawLayers();
    },

    setupWinScreen: function() {
      var opts = {
        fillStyle: '#000',
        layer: true,
        visible: false,
        groups: ['board', 'win-screen'],
        x: 300, y: 300,
        fontSize: 80,
        fontFamily: 'Monsterrat-Bold, sans-serif'
      };

      // Background
      $canvas.drawRect({
        fillStyle: 'rgba(233, 233, 233, 0.8)',
        x: 0, y: 250,
        width: 600, height: 150,
        fromCenter: false,
        layer: true,
        visible: false,
        groups: ['board', 'win-screen']
      });

      // Win Message
      opts.name = 'win-text-a';
      opts.text = 'YOU DID IT!';
      $canvas.drawText(opts);

      // Continue
      opts.name = 'win-text-b';
      opts.text = 'Press \'Enter\' to continue.';
      opts.fontSize = 35;
      opts.y += 60;
      $canvas.drawText(opts);

      $(document).keydown(function(event) {
        if (event.keyCode === 13) { // Enter was pressed
          if (levelManager.finishedLevel) {
            var stats = 'Level #' + (levelManager.currentLevel + 1) + ': ';
            stats += levelManager.currentMoves + ' ';
            stats += levelManager.currentResets + ' ' + levelManager.currentElapsed;

            levelManager.levelStats.push(stats);

            if (levelManager.nextLevel()) { // Go to Next level
              UIManager.updateLevelLabel();
              levelManager.setupLevel();
              UIManager.updateMoves();
              UIManager.updateTime();
            } else { // Experiment Finished. Go to questionnaire
              // TODO: Add questionnaire.
            }
          }
        }
      });
    },

    setupResetKey: function() {
      $(document).keydown(function(event) {
        if (event.keyCode === 82 && !levelManager.finishedLevel) { // R button was pressed
          levelManager.resetLevel(false);
          levelManager.currentMoves += 1;
          UIManager.updateMoves();
        }
      });
    },

    resetLevel: function(full) {
      $canvas.getLayerGroup('blocks').forEach(function(block) {
        canvasManager.resetBlock(block, full);
      });

      if (!full) {
        $canvas.getLayerGroup('nodes').forEach(function(node) {
          node.data.used = false;
        });
        levelManager.currentResets += 1;
        levelManager.completedNodeGroups = 0;
      }

      $canvas.drawLayers();
    },

    nodeComplete: function() {
      this.completedNodeGroups += 1;
      this.finishedLevel = this.completedNodeGroups === this.totalLevelNodeGroups;

      if (this.finishedLevel) {
        $canvas.setLayerGroup('nodes', {click: undefined});
        $canvas.setLayerGroup('win-screen', {visible: true});
      }
    },

    nodeReset: function() {
      this.completedNodeGroups -= 1;
    },

    nextLevel: function() {
      if (this.currentLevel + 1 !== levels.length) {
        this.currentLevel += 1;
        return true;
      } else {
        this.currentLevel = 0;
        return false;
      }
    },

    globalTimerInstance: function() {
      levelManager.totalTime += 100;

      levelManager.totalElapsed = Math.floor(levelManager.totalTime / 100) / 10;
      if(Math.round(levelManager.totalElapsed) == levelManager.totalElapsed) { levelManager.totalElapsed += '.0'; }

      var diff = (new Date().getTime() - levelManager.totalStart) - levelManager.totalTime;
      window.setTimeout(levelManager.globalTimerInstance, (100 - diff));
    },

    levelTimerInstance: function() {
      levelManager.currentTime += 100;

      levelManager.currentElapsed = Math.floor(levelManager.currentTime / 100) / 10;
      if(Math.round(levelManager.currentElapsed) == levelManager.currentElapsed) {
        levelManager.currentElapsed += '.00';
      } else {
        levelManager.currentElapsed += '0';
      }

      UIManager.updateTime();

      var diff = (new Date().getTime() - levelManager.currentStart) - levelManager.currentTime;
      if (!levelManager.finishedLevel) {
        window.setTimeout(levelManager.levelTimerInstance, (100 - diff));
      }
    }
  };


  var setupCanvas = function() {
    var size = 120;
    for (var i=0; i < 5; i++) {
      for (var j=0; j < 5; j++) {
        canvasManager.drawRect(j * size, i * size, size, size, '#000', 'block-' + (i * 120) + (j * 120), ['board', 'blocks'], false);
      }
    }

    levelManager.setupWinScreen();
    levelManager.setupLevel();
    levelManager.setupResetKey();

    $canvas.drawLayers();

  };

  $(document).ready(setupCanvas);
})(jQuery);
