import { useEffect, useState } from "react";
import { WaitingRoom } from "./components/WaitingRoom.jsx";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { Chat } from "./components/Chat.jsx";
import axios from 'axios';

const apiUrl = "https://api.polyk.space";

const App = () => {
	const [connection, setConnection] = useState(null);
	const [messages, setMessages] = useState([]);
	const [chatRoom, setChatRoom] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const joinChat = async (userName, chatRoom) => {
		var connection = new HubConnectionBuilder()
			.withUrl(`${apiUrl}/chat`)
			.withAutomaticReconnect()
			.build();

		connection.on("ReceiveMessage", (userName, message) => {
			setMessages((messages) => [...messages, { userName, "messageText": message }]);
		});

		try {
			await connection.start();
			await connection.invoke("JoinChat", { userName, chatRoom });

			setConnection(connection);
			setChatRoom(chatRoom);
		} catch (error) {
			console.log(error);
		}
	};

	const sendMessage = async (message) => {
		await connection.invoke("SendMessage", message);
	};

	const closeChat = async () => {
		await connection.stop();
		setConnection(null);
	};

	useEffect(() => {
		const fetchMessages = async () => {
			try {
			  // Сделать запрос к API
			  const response = await axios.get(`${apiUrl}/${chatRoom}`);
			  setMessages(response.data);
			} catch (err) {
			  setError('Ошибка при загрузке сообщений');
			  console.error(err);
			} finally {
			  setLoading(false); // Завершаем процесс загрузки
			}
		};
		
		fetchMessages();
	}, [chatRoom]);

	if (loading) {
		return <div>Загрузка...</div>;
	}

	return (
		<div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-500 to-purple-500 text-white">
			<header className="w-full p-4 bg-blue-700 shadow-md">
				<h1 className="text-2xl font-bold text-center">Добро пожаловать в чат!</h1>
			</header>
			<main className="flex-1 flex items-center justify-center">
				{connection ? (
					<div className="w-full max-w-2xl p-6 bg-white bg-opacity-20 rounded-lg shadow-lg">
						<Chat
							messages={messages}
							sendMessage={sendMessage}
							closeChat={closeChat}
							chatRoom={chatRoom}
						/>
					</div>
				) : (
					<div className="w-full max-w-md p-6 bg-white bg-opacity-20 rounded-lg shadow-lg">
						<WaitingRoom joinChat={joinChat} />
					</div>
				)}
			</main>
			<footer className="w-full p-4 bg-blue-700 text-center">
				<p>&copy; 2024 Чат. Все права защищены.</p>
			</footer>
		</div>
	);
};

export default App;
