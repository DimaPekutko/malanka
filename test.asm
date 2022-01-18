segment .data
segment .bss
segment .text
global _start
_start:
	push 127
	push 43
	pop rax
	pop rbx
	sub rax, rbx
	push rax
	push 321
	pop rax
	pop rbx
	sub rax, rbx
	push rax
	push 43
	pop rax
	pop rbx
	add rax, rbx
	push rax
	; exit
	mov rax, 60
	xor rdi, rdi
	syscall