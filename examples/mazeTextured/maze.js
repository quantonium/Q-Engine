/* edge structure */
class Edge {
   cell1;    /* edge connects cell1 and cell2 */
   cell2;
   vertex1;  /* endpoints of edge - indexes into vertex array */
   vertex2;
   valid;    /* edge can be removed */
   draw;     /* edge should be drawn */
   obj; /*actual drawn object type*/
}

/* global parameters */
var w, h, edges, perimeters, groups, group, redges, done=false;
var edge, perimeter;
var vertex;

var walls = []

/* init_maze initializes a w1 by h1 maze.  all walls are initially
   included.  the edge and perimeter arrays, vertex array, and group
   array are allocated and filled in.  */

function
init_maze(w1, h1)
{
  var i, j, vedges, hedges;
  var x, y, t, inc, xoff, yoff;

  vedges = (w1-1)*h1; /* number of vertical edges */
  hedges = (h1-1)*w1; /* number of horizontal edges */
  redges = edges = vedges + hedges;  /* number of removable edges */
  perimeters = 2*w1 + 2*h1;
  vertices = (w1+1)*(h1+1);
  groups = w1*h1;

  /* allocate edge array */
    edge = []
    for(i = 0; i < edges; i++)
        edge.push(new Edge())

  /* fill in the vertical edges */
  for (i=0; i<vedges; i++) {
    x = Math.floor(i%(w1-1)); /* convert edge number to column */
    y = Math.floor(i/(w1-1)); /* and row */
    j = Math.floor(y*w1 + x); /* convert to cell number */
    edge[i].cell1 = j;
    edge[i].cell2 = j+1;
    edge[i].vertex1 = Math.floor(y*(w1+1) + x+1);   /* convert to vertex number */
    edge[i].vertex2 = Math.floor((y+1)*(w1+1) + x+1);
    edge[i].valid = true;
    edge[i].draw = true;
  }
  for (i=vedges; i<edges; i++) {
    j = Math.floor(i - vedges); /* convert to cell number */
    x = Math.floor(j%w1);   /* convert edge number to column */
    y = Math.floor(j/w1);   /* and row*/
    edge[i].cell1 = j;
    edge[i].cell2 = j + w1;
    edge[i].vertex1 = Math.floor((y+1)*(w1+1) + x);   /* convert to vertex number */
    edge[i].vertex2 = Math.floor((y+1)*(w1+1) + x+1);
    edge[i].valid = true;
    edge[i].draw = true;
  }

  /* allocate perimeter */
  perimeter = []
    for(var i = 0; i < perimeters; i++)
        perimeter.push(new Edge())

  /* fill in horizontal perimeter */
  for (i=0; i<w1; i++) {
    perimeter[2*i].cell1 = i;
    perimeter[2*i].cell2 = i;
    perimeter[2*i].vertex1 = i;
    perimeter[2*i].vertex2 = i + 1;
    perimeter[2*i].valid = true;
    perimeter[2*i].draw = true;
    perimeter[2*i+1].cell1 = Math.floor(i + h1*w1);
    perimeter[2*i+1].cell2 = Math.floor(i + h1*w1);
    perimeter[2*i+1].vertex1 = Math.floor(i + h1*(w1+1));
    perimeter[2*i+1].vertex2 = Math.floor(i + h1*(w1+1) + 1);
    perimeter[2*i+1].valid = true;
    perimeter[2*i+1].draw = true;
  }
  /* fill in vertical perimeter */
  for (i=w1; i<w1+h1; i++) {
    j = i-w1;
    perimeter[2*i].cell1 = Math.floor(j*w1);
    perimeter[2*i].cell2 = Math.floor(j*w1);
    perimeter[2*i].vertex1 = j*(w1+1);
    perimeter[2*i].vertex2 = (j+1)*(w1+1);
    perimeter[2*i].valid = true;
    perimeter[2*i].draw = true;
    perimeter[2*i+1].cell1 = Math.floor((j+1)*w1 - 1);
    perimeter[2*i+1].cell2 = Math.floor((j+1)*w1 - 1);
    perimeter[2*i+1].vertex1 = Math.floor((j+1)*(w1+1) - 1);
    perimeter[2*i+1].vertex2 = Math.floor((j+2)*(w1+1) - 1);
    perimeter[2*i+1].valid = true;
    perimeter[2*i+1].draw = true;
  }

  //Verticies handled on a per-object basis, no need to generate vertexes as the maze is built. Generated here for debug only.
  /* allocate vertex array */
  vertex = []
  for(var i = 0; i < vertices; i++)
  vertex.push(vec2())

  /* figure out the spacing between vertex coordinates.  we want
     square cells so use the minimum spacing */
  inc = (3.6/w1)*10;
  t = (3.6/h1)*10;
  if (t < inc) {
    inc = t;
  }
  /* determine the required offsets to center the maze using the
     spacing calculated above */
  xoff = Math.floor((4.0-w1*inc)/2 - 2.0);
  yoff = Math.floor((4.0-h1*inc)/2 - 2.0);
  /* fill in the vertex array */
  for (i=0; i<vertices; i++) {
    x = Math.floor(i%(w1+1));
    y = Math.floor(i/(w1+1));
    vertex[i][0] = x*inc + xoff;
    vertex[i][1] = y*inc + yoff;
  }

  /* allocate the group table */
  group = []

  /* set the group table to the identity */
  for (i=0; i<groups; i++) {
    group[i] = i;
  }
}

/* this function removes one wall from the maze.  if removing this
   wall connects all cells, an entrance and exit are created and a
   done flag is set */
function
step_maze()
{
  var i, j, k, o, n;

  /* randomly select one of the the remaining walls */
  k = Math.floor(Math.random()*redges);
  /* scan down the edge array till we find the kth removeable edge */
  for (i=0; i<edges; i++) {
    if (edge[i].valid == true) {
      if (k == 0) {
        edge[i].valid = false;
        n = group[edge[i].cell1];
        o = group[edge[i].cell2];
        /* if the cells are already connected don't remove the wall */
        if (n != o) {
          edge[i].draw = false;
          done = true;
          /* fix up the group array */
          for (j=0; j<groups; j++) {
            if (group[j] == o) {
              group[j] = n;
            }
            if (group[j] != n) {
              done = false;     /* if we have more than one
                               group we're not done */
            }
          }
        }
        break;
      } else {
        k--;
      }
    }
  }
  redges--; /* decriment the number of removable edges */
  /* if we're done, create an entrance and exit */
  if (done) {
    for (j=0; j<2; j++) {
      /* randomly select a perimeter edge */
      k = Math.floor(Math.random()*(perimeters-j));
      for (i=0; i<perimeters; i++) {
        if (k == 0) {
          if (perimeter[i].valid == true) {
            perimeter[i].draw = false;
            break;
          }
        }
        else {
          k--;
        }
      }
    }
  }
}

var materials = [new _Material(3, [vec4(1,0,0,1), vec4(0,0,0,1), vec4(1,1,1,1), vec4(1,1,1,1), vec4(0,0,0,1), vec4(1, 8, 32, 10), vec4(1,1,0,0)]),
 new _Material(3, [vec4(0,1,0,1), vec4(1,1,1,1), vec4(0,0,0,1), vec4(1,1,1,1), vec4(1,0,0,1), vec4(1, 8, 32, 10), vec4(1,1,0,0)]),
 new _Material(3, [vec4(0,0,1,1), vec4(1,1,1,1), vec4(1,1,1,1), vec4(0,0,0,1), vec4(0,1,1,.5), vec4(1, 8, 32, 10), vec4(1,.1,0,0)]),
 new _Material(3, [vec4(1,1,0,1), vec4(0,0,0,1), vec4(0,0,0,1), vec4(1,1,1,1), vec4(1,1,1,1), vec4(10, 8, 32, 10), vec4(1,1,0,0)]),
 new _Material(3, [vec4(1,0,1,1), vec4(1,1,1,1), vec4(1,1,1,1), vec4(1,1,1,1), vec4(0,0,0,1), vec4(.1, 8, 32, 10), vec4(10,1,0,0)]),
 new _Material(3, [vec4(0,1,1,1), vec4(0,0,0,1), vec4(0,0,0,1), vec4(1,1,1,1), vec4(0,0,0,1), vec4(1, 8, 32, 10), vec4(1,1,0,0)])]

function
draw_maze()
{
  var p1 = vec2(), p2 = vec2()
  var i;
  var txArr = [new _ComplexTexture(_gl, ["images/Brick_Wall_015_COLOR.jpg", "images/Brick_Wall_015_NORM.jpg", "images/Brick_Wall_015_DISP.png", "images/Brick_Wall_015_OCC.jpg", "images/Brick_Wall_015_ROUGH.jpg", null])]

  /* draw the edges as lines */
  {
    /* draw the interior edges */
    for (i=0; i<edges; i++) {
      if (edge[i].draw == true) {
        p1 = vertex[Math.floor(edge[i].vertex1)];
        p2 = vertex[Math.floor(edge[i].vertex2)];
        var tmp = _getRect(vec3(0,0,0), vec3(Math.abs(p2[0]-p1[0])/2+.5, 5, Math.abs(p2[1]-p1[1])/2+.5))
        walls.push(new _Object({pos: vec3((p2[0]+p1[0])/2, 6, (p2[1]+p1[1])/2), rot: Quaternion(1,0,0,0), scl: vec3(1,1,1)},
        [{pointIndex: tmp.index, matIndex: [0], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: 0}],
        tmp.points, [materials[i%materials.length]], _Bounds._RECT, txArr))
      }
    }
    /* draw the perimeter edges */
    for (i=0; i<perimeters; i++) {
      if (perimeter[i].draw == true) {
        p1 = vertex[Math.floor(perimeter[i].vertex1)];
        p2 = vertex[Math.floor(perimeter[i].vertex2)];
        var tmp = _getRect(vec3(0,0,0), vec3(Math.abs(p2[0]-p1[0])/2+.5, 5, Math.abs(p2[1]-p1[1])/2+.5))
        walls.push(new _Object({pos: vec3((p2[0]+p1[0])/2, 6, (p2[1]+p1[1])/2), rot: Quaternion(1,0,0,0), scl: vec3(1,1,1)},
        [{pointIndex: tmp.index, matIndex: [0], texCoords: tmp.texCoords, type: _gl.TRIANGLES, normals: tmp.normals, tangents: tmp.tangents, textureIndex: 0}],
        tmp.points, [new _ScaledTexMat(true, .1, .1, 0, 0, 8, 32, .1)], _Bounds._RECT, txArr))
      }
    }
  }
}

function generateMaze_(w=10, h=10){
    init_maze(w, h);
  while (!done) {
    /* remove one edge */
    step_maze();
  }
  draw_maze()
}

/**
 * Lazy way to check that camera isn't in anything. Ignores y value.
 * I really need to work on collision/overlaps detection algorithms
 * @param {*} pos 
 */
function positionValid(pos, extent){
  for(var i = 0; i < walls.length; i++){
    var o = walls[i]
    var minX = Math.min(o._transform.pos[0]+o._bounds._extent[0]+o._bounds._pos[0], o._transform.pos[0]+o._bounds._pos[0]-o._bounds._extent[0])
    var minZ = Math.min(o._transform.pos[2]+o._bounds._extent[2]+o._bounds._pos[2], o._transform.pos[2]+o._bounds._pos[2]-o._bounds._extent[2])
    var maxX = Math.max(o._transform.pos[0]+o._bounds._extent[0]+o._bounds._pos[0], o._transform.pos[0]+o._bounds._pos[0]-o._bounds._extent[0])
    var maxZ = Math.max(o._transform.pos[2]+o._bounds._extent[2]+o._bounds._pos[2], o._transform.pos[2]+o._bounds._pos[2]-o._bounds._extent[2])
    var pointMin = vec3(minX, 0, minZ)
    var pointMax = vec3(maxX, 0, maxZ)
    
    if((pos[0]-extent[0] <= pointMax[0] && pos[0]+extent[0] >= pointMin[0]) && (pos[2]-extent[2] <= pointMax[2] && pos[2]+extent[2] >= pointMin[2])){
      //console.log("Colliding")
      return false
    }
      
  }
  return true
}