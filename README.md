# Malanka (programming language)


Malanka is a compiled, statically typed general purpose programming language written in TypeScript and similar to C, Ruby, and Typescript itself. 

# !!!WARNING!!!
Don't use this language for anything but entertainment!
 

## Hello World
```java
// import libc for printf
dlib "lc"

// print a message
printf("Hello, World!")
```


## Installation
Malanka requires some dependencies to be installed on your machine.

```bash
sudo apt-get install nodejs npm nasm freeglut3-dev # freeglut optionally
```
And install language itself:
```bash
npm install -g malanka-lang
```

## Usage
Create file, for example test.mal. Put inside:
```java
dlib "lc"

a @int = 1337

printf("%d\n", a)
```
Compile with commnad (in the project root folder):
```bash
malanka test.mal
```
And run it:
```bash
./test  # output: 1337
```


## Features
What is currently available:
- [x] Data types: ```@int, @doub, @str, @pointer, @func ```
- [x] Varaibles ```a @type = ...```
- [x] Complex expressions ```-((2*3/21+--3)-((32/6)*365))```
- [x] Conditions ```if 2>3: //body end```
- [x] For loops ```for i @int=0; i < 10; i++: // body end```
- [x] Arrays ```arr{length} @type = [a,b,c...]```
- [x] Functions ```.func_name @int # arg1 @int, arg2 @float: // body end```
- [x] Dynamic imports ```dlib "your_lib_path" (lib path should starts with l, for example for libc library use "lc")```
- [x] Symbol scopes

## Example of all features
```java
// import libc for printf
dlib "lc" // equal: "/lib/x86_64-linux-gnu/libc.so.x"

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

// array declaration example
arr{5} @int = [12,3,16,235,76]

// for example
for j @int = 0; j < 5; j = j + 1:
    printf("%d", arr[j])
end

// function example (without args)
.say_hello @void:
    puts("hello!")
end

// function example
.foo @doub # a @int, b @int:
    if a > b:
        ! 3.14
    else:
        ! 2.7
    end
end

// funcion call
foo(543, 2135)
```

## Supported platforms
You can run it only on these platforms:
- [x] Linux x86-64 (Tested only on Debian based)

## License
[MIT](https://choosealicense.com/licenses/mit/)
