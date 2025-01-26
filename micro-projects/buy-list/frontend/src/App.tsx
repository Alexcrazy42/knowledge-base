import { useState, useEffect } from 'react'
import axios from 'axios';

import './App.css'

const apiUrl1 = import.meta.env.VITE_API_URL;
console.log(apiUrl1);

export interface Buy {
  id: string;
  name: string;
  price: number
}

export interface CreateBuyRequest {
  name: string;
  price: number
}

export interface UpdateBuyRequest {
  name: string | null;
  price: number | null
}

function App() {
  const [buys, setBuys] = useState<Buy[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState<string>('');
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [newBuyName, setNewBuyName] = useState<string>('');
  const [newBuyPrice, setNewBuyPrice] = useState<number>(0);

  const startEditing = (buy: Buy) => {
    setEditingId(buy.id);
    setEditedName(buy.name);
    setEditedPrice(buy.price)
  };

  const saveEdit = async (id: string) => {
    try {
        const updateRequest: UpdateBuyRequest = {
          name: editedName,
          price: editedPrice
        }

        console.log(updateRequest);

        await axios.put(`${apiUrl1}/Buy/${id}`, JSON.stringify(updateRequest), {
            headers: {
                'Content-Type': 'application/json',
                'Accept': '*/*'
            }
        });

        setBuys(buys.map(buy => 
          buy.id === id ? { ...buy, name: editedName, price: editedPrice } : buy
        ));

        setEditingId(null);
    } catch (error) {
        console.error('Error updating todo:', error);
    }
  };

  const deleteBuy = async (id: string) => {
    try {
        await axios.delete(`${apiUrl1}/Buy/${id}`, {
            headers: {
                'Accept': '*/*'
            }
        });
        setBuys(buys.filter(buy => buy.id !== id));
    } catch (error) {
        console.error('Error deleting todo:', error);
    }
  };

  const createBuy = async () => {
    if (!newBuyName.trim() && newBuyPrice != null) return;

    try {
        const request : CreateBuyRequest = {
          name: newBuyName,
          price: newBuyPrice
        }
        const response = await axios.post(`${apiUrl1}/Buy`, JSON.stringify(request), {
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const newBuy: Buy = {
            id: response.data.id,
            name: response.data.name,
            price: response.data.price
        };

        setBuys([...buys, newBuy]);
        setNewBuyName('');
        setNewBuyPrice(0);
    } catch (error) {
        console.error('Error creating todo:', error);
    }
  };

  useEffect(() => {
    const fetchBuys = async () => {
        try {
            const response = await axios.get<Buy[]>(`${apiUrl1}/Buy`, {
                headers: {
                    'Accept': '*/*'
                }
            });

            setBuys(response.data);
            console.log(buys);
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    };

    fetchBuys();
}, []);


  return (
    <div>
      <h1>Buys List</h1>
      <div style={{ marginBottom: '20px' }}>
                <input 
                    type="text" 
                    value={newBuyName} 
                    onChange={(e) => setNewBuyName(e.target.value)} 
                    placeholder="New Buy Name" 
                />
                <input 
                  type="number"
                  value={newBuyPrice}
                  onChange={(e) => setNewBuyPrice(e.target.value)} 
                    placeholder="New Buy Price" 
                />
                <button onClick={createBuy}>Create</button>
      </div>

      <ul>
                {buys.map(buy => (
                    <li key={buy.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        {editingId === buy.id ? (
                            <>
                                <input 
                                    type="text" 
                                    value={editedName} 
                                    onChange={(e) => setEditedName(e.target.value)} 
                                />
                                 <input 
                                    type="number" 
                                    value={editedPrice}
                                    onChange={(e) => setEditedPrice(e.target.value)} 
                                />
                                <button onClick={() => saveEdit(buy.id)}>Save</button>
                                <button onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                        ) : (
                            <>
                                <span style={{ flexGrow: 1 }}>
                                    {buy.name} - {buy.price}
                                </span>
                                <button onClick={() => startEditing(buy)}>Edit</button>
                                <button onClick={() => deleteBuy(buy.id)}>Delete</button>
                            </>
                        )}
                    </li>
                ))}
            </ul>
    </div>
  )
}

export default App
