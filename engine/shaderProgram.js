class shaderProgram{

    program;

    constructor(gl, vShader, fShader){
        this.compileShaders(gl, vShader, fShader);
    }

    getProgram(){
        return this.program;
    }

    //initially from common files
    compileShaders(gl, vShaderName, fShaderName) {
        function getShader(gl, shaderName, type) {
            var shader = gl.createShader(type),
                shaderScript = loadFileAJAX(shaderName);
            if (!shaderScript) {
                alert("Could not find shader source: "+shaderName);
            }
            gl.shaderSource(shader, shaderScript);
            gl.compileShader(shader);
    
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                alert(gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }
        var vertexShader = getShader(gl, vShaderName, gl.VERTEX_SHADER),
            fragmentShader = getShader(gl, fShaderName, gl.FRAGMENT_SHADER);
        this.program = gl.createProgram();
    
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
    
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            alert("Could not initialise shaders The error log is: " + gl.getProgramInfoLog( this.program ));
            console.error("Could not initialise shaders The error log is: " + gl.getProgramInfoLog( this.program ));
            
            return null;
        }
    };
}


