;	this assembly file generated by compiler
	extern printf
	extern __bootstrap
	extern __esModule
	extern __ARGC__
	extern __ARGV__
	extern char_to_int
	extern int_to_doub
segment .text
global _start
_start:
	call __bootstrap
	mov rax, 100
	mov [my_var], rax
	; ------ funccall -> printf
	mov rax, str_njtjlTE6mP
	mov rdi, rax
	mov rax, [my_var]
	mov rsi, rax
	sub rsp, 16
	mov rax, 0
	call printf
	add rsp, 16
	; ------ funccall end -> printf
	; exit
	mov rax, 60
	xor rdi, rdi
	syscall
segment .bss
	my_var resb 8
segment .data
	buffer_XmxaV dq 0
	str_njtjlTE6mP db `hello %d\n`,0