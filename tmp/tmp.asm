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
	mov rax, 9
	mov [arg], rax
	; ------ funccall -> printf
	; ------ funccall -> fact
	mov rax, [arg]
	mov rdi, rax
	sub rsp, 16
	mov rax, 0
	call fact
	add rsp, 16
	; ------ funccall end -> fact
	mov rdx, rax
	mov rax, str_LpO7zPOG2a
	mov rdi, rax
	mov rax, [arg]
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
fact:
	push rbp
	mov rbp, rsp
	push rdi
COND_START__9VDlR___0:
BINOP_START__K7gc0___4:
	push rbx
	mov rax, 1
	mov rbx, rax
	mov rax, [rbp-8]
COMP_START__kEtNU___5:
	cmp rax, rbx
	jg COMP_RIGHT__XaVDu___6
	xor rax, rax
	jmp COMP_END__lwvGI___7
COMP_RIGHT__XaVDu___6:
	mov rax, 1
COMP_END__lwvGI___7:
	pop rbx
BINOP_END__x0aYP___8:
	test rax, rax
	jz IF_END__0rmnp___2
IF_START__4MGeV___1:
BINOP_START__BzTiq___9:
	push rbx
	mov rax, [rbp-8]
	mov rbx, rax
	; ------ funccall -> fact
BINOP_START__TNVYD___10:
	push rbx
	mov rax, 1
	mov rbx, rax
	mov rax, [rbp-8]
	mov [buffer_9uoEa], rax
	fild qword [buffer_9uoEa]
	mov [buffer_9uoEa], rbx
	fild qword [buffer_9uoEa]
	fsub
	fistp qword [buffer_9uoEa]
	mov rax, [buffer_9uoEa]
	pop rbx
BINOP_END__zcPJU___11:
	mov rdi, rax
	sub rsp, 16
	mov rax, 0
	call fact
	add rsp, 16
	; ------ funccall end -> fact
	mov [buffer_9uoEa], rax
	fild qword [buffer_9uoEa]
	mov [buffer_9uoEa], rbx
	fild qword [buffer_9uoEa]
	fmul
	fistp qword [buffer_9uoEa]
	mov rax, [buffer_9uoEa]
	pop rbx
BINOP_END__qlGdt___12:
	mov rsp, rbp
	pop rbp
	ret
	jmp COND_END__8V1hI___3
IF_END__0rmnp___2:
COND_END__8V1hI___3:
	mov rax, 1
	mov rsp, rbp
	pop rbp
	ret
	xor rax, rax
	mov rsp, rbp
	pop rbp
	ret
segment .bss
	arg resb 8
segment .data
	buffer_9uoEa dq 0
	str_LpO7zPOG2a db `fact %d => %d\n`,0