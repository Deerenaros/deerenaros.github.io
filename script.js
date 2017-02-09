var energy_from_photo = 0.2;
var kenergy_from_eat = 0.5;

var energy_for_life = 0.018;
var energy_for_attack = 0.03;
var energy_for_turn = 0.01;
var energy_for_move = 0.01;


var gensize = 20;

String.prototype.replacedAt = function(index, char) {
    var a = this.split("");
    a[index] = char;
    return a.join("");
}

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
};

$(document).ready(function() {
    var cells = [];
    var cnv = document.getElementById("canvas");
    var ctx = cnv.getContext("2d");
    var img = ctx.getImageData(0, 0, cnv.width, cnv.height);
    
    function cell(x, y, c = null) {
        x = Math.trunc(x)
        y = Math.trunc(y)
        
        if(typeof cells[x] === "undefined") {
            cells[x] = []
        }
        
        if(typeof cells[x][y] === "undefined") {
            cells[x][y] = {x: x, y: y, r: 0, energy: 0, health: 0, gen: "", empty: true};
        }
        
        if(c === null) {
            return cells[x][y];
        }
        
        cells[x][y] = c;
    }
    
    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    function mutate(gen) {
        if(Math.random() > 0.0) {
            var available = Object.keys(performs);
            return gen.replacedAt(rand(0, gen.length-1), available[rand(0, available.length-1)]);
        }
    }
    
    function dupcell(x, y) {
        if(icell(x, y) && ncell(x, y).empty && cell(x, y).energy > 0.8 && cell(x, y).health > 0.8) {
            cell(x, y).energy /= 2;
            cell(x, y).health /= 2;
            ncell(x, y, {
                x: ncell(x, y).x,
                y: ncell(x, y).x,
                r: cell(x, y).r,
                energy: cell(x, y).energy,
                health: cell(x, y).health,
                gen: mutate(cell(x, y).gen),
                empty: false,
            });
        }
    }
    
    function mcell(x, y, force = false) {
        if(icell(x, y) && (force || ncell(x, y).empty)) {
            cell(x, y).x = ncell(x, y).x;
            cell(x, y).y = ncell(x, y).y;
            cell(ncell(x, y).x, ncell(x, y).x, cell(x, y));
            cells[x][y] = {x: x, y: y, r: 0, energy: 0, health: 0, gen: "", empty: true};
        }
    }
    
    function icell(x, y) {
        return x >= 0 && x < img.width && y >= 0 && y < img.height;
    }
    
    function ncell(x, y, c=null) {
        switch(((cell(x, y).r%4)+4)%4) {
        case 0:
            return cell(x+0, y-1, c);
        case 1:
            return cell(x+1, y+0, c);
        case 2:
            return cell(x+0, y+1, c);
        case 3:
            return cell(x-1, y+0, c);
        }
    }
    
    function dcell(x, y) {
        cells[x][y] = {x: x, y: y, r: 0, energy: 0, health: 0, gen: "", empty: true};
    }
    
    function rgb(x, y, c = null) {
        if(x < 0 || x >= img.width || y < 0 || y >= img.height) {
            return null;
        }
        
        if(c === null) {
            return [
                img.data[4*img.height*y + 4*x + 0],
                img.data[4*img.height*y + 4*x + 1],
                img.data[4*img.height*y + 4*x + 2],
            ];
        }
        
        
        img.data[4*img.height*y + 4*x + 0] = c[0]
        img.data[4*img.height*y + 4*x + 1] = c[1]
        img.data[4*img.height*y + 4*x + 2] = c[2]
        img.data[4*img.height*y + 4*x + 3] =  255
    }

    function g(v) {
        return [Math.trunc(255*v), Math.trunc(255*(1-v)), 0];
    }
    
    function photo(x, y) {
        if(cell(x, y).energy < 1) {
            cell(x, y).energy += energy_from_photo;
        }
    }
    
    function consume(x, y, v) {
        if(cell(x, y).energy > v) {
            cell(x, y).energy += v;
            return true;
        } else {
            return false;
        }
    }
    
    var performs = {
        "M": function(x, y) {
            photo(x, y);
            mcell(x, y, ncell(x, y).x, ncell(x, y).y);
            return consume(x, y);
        },
        ">": function(x, y) {
            photo(x, y);
            cell(x, y).r += 1;
            return consume(x, y, energy_for_turn) && consume(x, y, energy_for_life);
        },
        "<": function(x, y) {
            photo(x, y);
            cell(x, y).r -= 1;
            return consume(x, y, energy_for_turn) && consume(x, y, energy_for_life);
        },
        "A": function(x, y) {
            photo(x, y);
            if(!ncell(x, y).empty) {
                ncell(x, y).health -= 0.1;
            }
            return consume(x, y, energy_for_attack) && consume(x, y, energy_for_life);
        },
        "E": function(x, y) {
            photo(x, y);
            if(icell(x, y) && !ncell(x, y).empty && ncell(x, y).health <= 0) {
                cell(x, y).energy += kenergy_from_eat*ncell(x, y).energy;
                mcell(x, y, true);
            }
            return consume(x, y, energy_for_life);
        },
        "S": function(x, y) {
            photo(x, y);
            cell(x, y).health += 0.12;
            return consume(x, y, energy_for_life);
        },
        "D": function(x, y) {
            dupcell(x, y);
        }
    }

    function process() {
        for(var i = 0; i < gensize; i++) {
            for(var x = 0; x < img.width; x++) {
                for(var y = 0; y < img.height; y++) {
                    if(!cell(x, y).empty) {
                        performs[cell(x, y).gen[i]](x, y);
                    }
                }
            }
        }
        
        
        for(var x = 0; x < img.width; x++) {
            for(var y = 0; y < img.height; y++) {
                if(cell(x, y).empty) {
                    rgb(x, y, [85, 100, 215]);
                } else {
                    rgb(x, y, g(1 - cell(x, y).energy));
                }
            }
        }
        
        ctx.putImageData(img, 0, 0);
    }
    
    cell(img.width/2, 0, {
        x: 50,
        y: 0,
        r: 2,
        energy: 1,
        health: 1,
        gen: ">SSD>SSD>SSD>SSD>SSD",
        empty: false,
    });
    
    setInterval(process, 1000./5);
});