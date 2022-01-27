# Malanka

Malanka is a compiled, statically typed general purpose programming language written in TypeScript and similar to C, Ruby, and Typescript itself.

## Hello World
```
// import libc for printf
dynamic "/lib/x86_64-linux-gnu/libc.so.6"

// print a message
printf("Hello, World!")
```

## Installation
Malanka requires npm to be installed on your machine.

```bash
git clone https://github.com/DimaPekutko/malanka
cd malanka
npm i
```

## Usage
Edit tmp/source.mal file:
```
dynamic "/lib/x86_64-linux-gnu/libc.so.6"

a @int = 1337

printf("%d", a)
```
Compile with commnad:
```bash
npm start
```
And run it:
```bash
./tmp/test # output: 1337
```


## Features
What is currently available:
- [x] Data types: ```@int, @doub ```
- [x] Varaibles ```a @type = ...```
- [x] Complex expressions ```-((2*3/21+--3)-((32/6)*365))```
- [x] Conditions ```if 2>3: printf("hello") end```
- [ ] For loops
- [ ] Arrays
- [ ] Functions
- [x] Dynamic imports ```dynamic "your_lib_path"```

## Example of all features
```
// import libc for printf
dynamic "/lib/x86_64-linux-gnu/libc.so.6"

// var declaration example
a @int = -22+(32/3+43)*8-5

// var assignment example
a = a * 2

// if else example
if a == 10 and 3 < 4:
    printf("okay")
elif 22 or a > 10:
    printf("hmm... that is elif")
else:
    printf("else case")
end
```

## License
[MIT](https://choosealicense.com/licenses/mit/)