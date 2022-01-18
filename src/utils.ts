import util from "util"; 

// log full object
export const dump = (obj: any) :void => {
    console.log(
        util.inspect(obj,false,null,true)
    );
}