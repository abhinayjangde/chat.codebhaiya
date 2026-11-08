.PHONY: build run dev web server

web:
	cd web && pnpm run dev

server:
	cd server && pnpm run dev

dev: server web
	make -j2 dev