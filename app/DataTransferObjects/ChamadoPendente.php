<?php

namespace App\DataTransferObjects;

final readonly class ChamadoPendente
{
    public function __construct(
        public string $numeroChamado,
        public int $itemId,
        public int $unidadeId,
        public int $quantidade,
    ) {}
}
