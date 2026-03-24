from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class CreateArticuloRequest(BaseModel):
    nombre: str
    sku: Optional[str] = None
    unidad_medida: str
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None


class UpdateArticuloRequest(BaseModel):
    nombre: Optional[str] = None
    sku: Optional[str] = None
    unidad_medida: Optional[str] = None
    stock_minimo: Optional[Decimal] = None
    stock_maximo: Optional[Decimal] = None
    coste_unitario: Optional[Decimal] = None
    categoria_almacen: Optional[str] = None
