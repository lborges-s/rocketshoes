import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = window.localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const copiedCart = cart.map((p) => ({ ...p }));

      const cartProduct = copiedCart.find(
        (product) => product.id === productId
      );

      let amountToAdd = 1;

      if (cartProduct) {
        cartProduct.amount += 1;
        amountToAdd = cartProduct.amount;
      } else {
        const product = await api
          .get<Product>(`/products/${productId}`)
          .then((response) => ({ ...response.data, amount: 1 }));
        copiedCart.push(product);
      }

      const stock = await api
        .get<Stock>(`/stock/${productId}`)
        .then((response) => response.data);

      if (amountToAdd > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart(copiedCart);
      window.localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(copiedCart)
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(
        (product) => product.id === productId
      );

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1);
        setCart(updatedCart);

        window.localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(updatedCart)
        );
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api
        .get<Stock>(`/stock/${productId}`)
        .then((response) => response.data);

      if (amount > stock.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const copiedCart = cart.map((p) => {
        if (p.id === productId) {
          const newProduct = {
            ...p,
            amount: amount,
          };

          return newProduct;
        }
        return p;
      });

      setCart(copiedCart);

      window.localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(copiedCart)
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
