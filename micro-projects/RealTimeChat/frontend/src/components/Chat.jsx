import { Button, CloseButton, Heading, Input } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { Message } from "./Message";

export const Chat = ({ messages, chatRoom, sendMessage, closeChat }) => {
	const [message, setMessage] = useState("");
	const messagesEndRef = useRef(null);

	useEffect(() => {
		messagesEndRef.current.scrollIntoView();
	}, [messages]);

	const onSendMessage = () => {
		sendMessage(message);
		setMessage("");
	};

	return (
		<div className="w-full max-w-lg mx-auto bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-2xl shadow-xl transform hover:scale-105 transition-transform duration-300">
			<div className="flex flex-row justify-between items-center mb-5">
				<h1 className="text-2xl font-bold text-white">{chatRoom}</h1>
				<button
					onClick={closeChat}
					className="text-white hover:text-red-500 focus:outline-none"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div className="flex flex-col overflow-auto scroll-smooth h-64 gap-3 pb-3 bg-white bg-opacity-10 rounded-lg p-3">
				{messages.map((messageInfo, index) => (
					<Message messageInfo={messageInfo} key={index} />
				))}
				<span ref={messagesEndRef} />
			</div>
			<div className="flex gap-3 mt-4">
				<input
					type="text"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Введите сообщение"
					className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-black"
				/>
				<button
					onClick={onSendMessage}
					className="px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Отправить
				</button>
			</div>
		</div>
	);
};
