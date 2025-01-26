import React from 'react';

export const Message = ({ messageInfo }) => {
	return (
		<div className="max-w-xs mx-auto bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 p-4 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300">
			<div className="flex items-center mb-2">
				<span className="text-lg font-bold text-white">{messageInfo.userName}</span>
			</div>
			<div className="p-3 bg-white bg-opacity-20 rounded-lg shadow-inner">
				<p className="text-white text-base">{messageInfo.messageText}</p>
			</div>
		</div>
	);
};