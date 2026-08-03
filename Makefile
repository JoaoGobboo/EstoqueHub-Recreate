.DEFAULT_GOAL := help

PHP ?= php
COMPOSER ?= composer
NPM ?= npm
DOCKER_COMPOSE ?= docker compose
PHPSTAN_MEMORY ?= 512M

ARTISAN := $(PHP) artisan

ifeq ($(OS),Windows_NT)
NOOP := @rem
else
NOOP := @:
endif

.PHONY: help setup install dev serve frontend build test test-filter lint \
	format-check format types check audit doctor migrate migrate-fresh seed \
	db-reset cache-clear routes artisan docker-build docker-up docker-down \
	docker-restart docker-logs docker-ps docker-shell docker-artisan docker-migrate

help:
	$(info EstoqueHub - comandos disponiveis)
	$(info )
	$(info Preparacao e desenvolvimento)
	$(info   make setup             Instala e configura o projeto pela primeira vez)
	$(info   make install           Instala dependencias PHP e JavaScript)
	$(info   make dev               Inicia o ambiente local completo)
	$(info   make serve             Inicia somente o servidor Laravel)
	$(info   make frontend          Inicia somente o Vite)
	$(info   make build             Gera os assets de producao)
	$(info )
	$(info Qualidade)
	$(info   make test              Gera os assets e executa os testes PHP)
	$(info   make test-filter FILTER=NomeDoTeste)
	$(info   make lint              Verifica PHP e JavaScript)
	$(info   make format-check      Verifica a formatacao do frontend)
	$(info   make format            Formata PHP e frontend)
	$(info   make types             Executa PHPStan e TypeScript)
	$(info   make check             Executa todas as verificacoes)
	$(info   make audit             Audita vulnerabilidades das dependencias)
	$(info   make doctor            Verifica as ferramentas do ambiente)
	$(info )
	$(info Banco e Laravel)
	$(info   make migrate           Executa as migrations pendentes)
	$(info   make migrate-fresh     Recria o banco sem seed)
	$(info   make seed              Executa os seeders)
	$(info   make db-reset          Recria o banco e executa os seeders)
	$(info   make cache-clear       Limpa os caches do Laravel)
	$(info   make routes            Lista as rotas da aplicacao)
	$(info   make artisan ARGS=...  Executa um comando Artisan)
	$(info )
	$(info Docker)
	$(info   make docker-build      Constroi a imagem)
	$(info   make docker-up         Constroi e inicia os containers)
	$(info   make docker-down       Encerra os containers)
	$(info   make docker-restart    Reinicia os containers)
	$(info   make docker-logs       Acompanha os logs da aplicacao)
	$(info   make docker-ps         Exibe o estado dos containers)
	$(info   make docker-shell      Abre um shell no container da aplicacao)
	$(info   make docker-artisan ARGS=...)
	$(info   make docker-migrate    Executa migrations no container)
	$(NOOP)

setup:
	$(COMPOSER) run setup

install:
	$(COMPOSER) install --no-interaction --prefer-dist
	$(NPM) ci

dev:
	$(COMPOSER) run dev

serve:
	$(ARTISAN) serve

frontend:
	$(NPM) run dev

build:
	$(NPM) run build

test: build
	$(ARTISAN) test

test-filter: build
	$(ARTISAN) test --filter="$(FILTER)"

lint:
	$(COMPOSER) run lint:check
	$(NPM) run lint:check

format-check:
	$(NPM) run format:check

format:
	$(COMPOSER) run lint
	$(NPM) run format

types:
	$(PHP) vendor/bin/phpstan analyse --memory-limit=$(PHPSTAN_MEMORY)
	$(NPM) run types:check

check: lint format-check types test

audit:
	$(COMPOSER) audit
	$(NPM) audit

doctor:
	$(PHP) --version
	$(COMPOSER) diagnose
	$(NPM) --version
	$(DOCKER_COMPOSE) version
	$(DOCKER_COMPOSE) config --quiet

migrate:
	$(ARTISAN) migrate

migrate-fresh:
	$(ARTISAN) migrate:fresh

seed:
	$(ARTISAN) db:seed

db-reset:
	$(ARTISAN) migrate:fresh --seed

cache-clear:
	$(ARTISAN) optimize:clear

routes:
	$(ARTISAN) route:list

artisan:
	$(ARTISAN) $(ARGS)

docker-build:
	$(DOCKER_COMPOSE) build

docker-up:
	$(DOCKER_COMPOSE) up -d --build

docker-down:
	$(DOCKER_COMPOSE) down

docker-restart:
	$(DOCKER_COMPOSE) restart

docker-logs:
	$(DOCKER_COMPOSE) logs --follow app

docker-ps:
	$(DOCKER_COMPOSE) ps

docker-shell:
	$(DOCKER_COMPOSE) exec app bash

docker-artisan:
	$(DOCKER_COMPOSE) exec app php artisan $(ARGS)

docker-migrate:
	$(DOCKER_COMPOSE) exec app php artisan migrate --force
