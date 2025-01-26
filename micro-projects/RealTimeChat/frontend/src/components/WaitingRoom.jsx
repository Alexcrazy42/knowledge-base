import { Button, Heading, Input, Text } from "@chakra-ui/react";
import { useState } from "react";

export const WaitingRoom = ({ joinChat }) => {
	const [userName, setUserName] = useState();
	const [charRoom, setChatRoom] = useState();

	const onSubmit = (e) => {
		e.preventDefault();
		joinChat(userName, charRoom);
	};

	return (
		<form
			onSubmit={onSubmit}
			className="max-w-md w-full bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-8 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300"
		>
			<div className="text-center mb-6">
				<h1 className="text-3xl font-bold text-white">Онлайн чат</h1>
				<p className="text-sm text-gray-200">Присоединяйтесь к нашему чату!</p>
			</div>
			<div className="mb-4">
				<label className="block text-sm font-medium text-white">Имя пользователя</label>
				<input
					type="text"
					name="username"
					placeholder="Введите ваше имя"
					onChange={(e) => setUserName(e.target.value)}
					className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
				/>
			</div>
			<div className="mb-6">
				<label className="block text-sm font-medium text-white">Название чата</label>
				<input
					type="text"
					name="chatname"
					placeholder="Введите название чата"
					onChange={(e) => setChatRoom(e.target.value)}
					className="mt-1 p-2 w-full border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
				/>
			</div>
			<div className="text-center">
				<button
					type="submit"
					className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-white hover:bg-blue-500 active:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Присоединиться
				</button>
			</div>
		</form>
	);
};
