import util from "util"; 
import { execSync } from "child_process"
import { readFileSync } from "fs";

// log full object
export const dump = (obj: any) :void => {
    console.log(
        util.inspect(obj,false,null,true)
    )
}

export const read_from_file = (file: string): string => {
    let data = readFileSync(file, "utf-8")
    return data
}

export const exit = () => process.exit()

export const uid = (length: number): string => {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *charactersLength));
    }
    return result;
}

export abstract class SharedLibManager {
    static get_lib_symbols(path: string): string {
        const cmd =
            `readelf -d -T --dyn-syms ${path} | `+
            `grep GLOBAL | `+
            `awk 'BEGIN { ORS = ""; print " [ "}
            { printf "%s{\\"size\\": \\"%s\\", \\"type\\": \\"%s\\", \\"name\\": \\"%s\\"}",
                  separator, $3, $4, $8
              separator = ", "
            }
            END { print " ] " }'`;
        let output: Buffer = execSync(cmd)
        let res_string: string = Buffer.from(output).toString()
        return res_string
    }
}