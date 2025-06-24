import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type FC, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix,
  FaGamepad, FaComments, FaHandshake, FaTrophy, FaPlay,
  FaPause, FaVolumeUp, FaVolumeMute, FaCog, FaPaperPlane,
  FaSmile, FaLaugh, FaHeart, FaFire, FaStar
} from 'react-icons/fa';
import { IoClose, IoSwapHorizontal, IoSend } from 'react-icons/io5';

//================================================================================
// 1. TYPE DEFINITIONS
//================================================================================
type PlayerId = 1 | 2;

interface Player {
  id: PlayerId;
  name: string;
  color: string;
  piecePosition: number; // 0-15 for 4x4, 0-8 for 3x3
  money: number;
}

interface ChatMessage {
  id: number;
  playerName: string;
  playerColor: string;
  text: string;
}

interface TradeOffer {
  id: number;
  fromPlayerId: PlayerId;
  toPlayerId: PlayerId;
  amount: number;
  message: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  createdTurn: number; // Track when the offer was created
}

interface MoneySquare {
  position: number;
  amount: number;
  collected: boolean;
}

//================================================================================
// 2. CONSTANTS & INITIAL STATE
//================================================================================
const DESKTOP_BOARD_SIZE = 4;
const MOBILE_BOARD_SIZE = 3;

const CALM_BLUE_PALETTE = {
  light: '#90D5FF',   // Backgrounds, highlights
  medium: '#57B9FF',  // Player pieces, buttons
  text: '#77B1D4',    // Main text, borders
  dark: '#517891',    // Darker text, shadows
};

const INITIAL_PLAYERS: Record<PlayerId, Player> = {
  1: { id: 1, name: 'Aqua', color: '#57B9FF', piecePosition: 0, money: 100 },
  2: { id: 2, name: 'Ocean', color: '#3d82b3', piecePosition: 0, money: 100 },
};

const EMOJI_SHORTCUTS: Record<string, string> = {
  '(dice)': '🎲',
  '(win)': '🏆',
  '(trade)': '🤝',
  '(money)': '💰',
  '(sad)': '😢',
  '(happy)': '😊',
  '(fire)': '🔥',
  '(heart)': '❤️',
  '(laugh)': '😂',
  '(cool)': '😎',
  '(think)': '🤔',
  '(wow)': '😮',
  '(party)': '🎉',
  '(rocket)': '🚀',
  '(star)': '⭐',
  '(thumbs)': '👍',
  '(clap)': '👏',
  '(boom)': '💥',
  '(sparkle)': '✨',
  '(gem)': '💎',
};

//================================================================================
// 3. HELPER & CUSTOM HOOKS
//================================================================================

/**
 * Get the appropriate dice icon for a roll value
 */
const getDiceIcon = (value: number) => {
  const icons = [FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix];
  return icons[value - 1] || FaDiceOne;
};

/**
 * Generate random money squares on the board
 */
const generateMoneySquares = (totalSquares: number): MoneySquare[] => {
  const moneySquares: MoneySquare[] = [];
  const numMoneySquares = Math.floor(totalSquares * 0.3); // 30% of squares have money
  const usedPositions = new Set<number>();
  
  for (let i = 0; i < numMoneySquares; i++) {
    let position;
    do {
      position = Math.floor(Math.random() * (totalSquares - 1)) + 1; // Exclude start position
    } while (usedPositions.has(position));
    
    usedPositions.add(position);
    moneySquares.push({
      position,
      amount: [10, 15, 20, 25][Math.floor(Math.random() * 4)], // Random money amounts
      collected: false
    });
  }
  
  return moneySquares;
};

/**
 * Animation variants for smooth transitions
 */
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const scaleIn = {
  initial: { scale: 0 },
  animate: { scale: 1 },
  exit: { scale: 0 }
};

const slideInLeft = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -100, opacity: 0 }
};

const slideInRight = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 }
};

/**
 * Custom hook to detect screen size for responsive layout
 */
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return isMobile;
};

/**
 * Custom hook for swipe detection on touch devices
 */
const useSwipe = (onSwipe: (direction: 'left' | 'right' | 'up' | 'down') => void) => {
    const touchStart = useRef<{ x: number, y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        const firstTouch = e.touches[0];
        touchStart.current = { x: firstTouch.clientX, y: firstTouch.clientY };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStart.current) return;
        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        const diffX = touchStart.current.x - moveX;
        const diffY = touchStart.current.y - moveY;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 50) onSwipe('left');
            else if (diffX < -50) onSwipe('right');
        } else {
            if (diffY > 50) onSwipe('up');
            else if (diffY < -50) onSwipe('down');
        }
        touchStart.current = null; // Reset after first swipe detection
    };
    
    return { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove };
};


/**
 * Parses chat text for emoji shortcuts
 */
const parseEmojiShortcuts = (text: string): string => {
  let parsedText = text;
  for (const shortcut in EMOJI_SHORTCUTS) {
    const regex = new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    parsedText = parsedText.replace(regex, EMOJI_SHORTCUTS[shortcut]);
  }
  return parsedText;
};

//================================================================================
// 4. CHILD COMPONENTS
//================================================================================

//--- GamePiece Component ---
interface GamePieceProps {
  player: Player;
  boardSize: number;
  squareSize: number;
}
const GamePiece: FC<GamePieceProps> = ({ player, boardSize, squareSize }) => {
  const row = Math.floor(player.piecePosition / boardSize);
  const col = player.piecePosition % boardSize;
  
  return (
    <motion.div
      className="game-piece"
      style={{
        backgroundColor: player.color,
      }}
      animate={{
        x: col * squareSize,
        y: row * squareSize,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.8
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="piece-inner">
        <span className="piece-label">{player.name[0]}</span>
      </div>
    </motion.div>
  );
};

//--- BoardSquare Component ---
interface BoardSquareProps {
  index: number;
  moneySquare?: MoneySquare;
}
const BoardSquare: FC<BoardSquareProps> = ({ index, moneySquare }) => {
    return (
      <div className="board-square">
        <span className="square-number">{index + 1}</span>
        {moneySquare && !moneySquare.collected && (
          <div className="money-indicator">
            💰${moneySquare.amount}
          </div>
        )}
      </div>
    );
}


//--- PlayerPanel Component ---
interface PlayerPanelProps {
  player: Player;
  isCurrentPlayer: boolean;
  onTrade: (playerId: PlayerId) => void;
  className?: string;
  hasPendingTrade?: boolean;
  hasIncomingTrade?: boolean;
}
const PlayerPanel: FC<PlayerPanelProps> = ({ player, isCurrentPlayer, onTrade, className, hasPendingTrade, hasIncomingTrade }) => {
  return (
    <motion.div 
      className={`player-panel ${isCurrentPlayer ? 'active' : ''} ${className || ''}`}
      style={{ borderColor: player.color }}
      variants={className === 'p2' ? slideInRight : slideInLeft}
      initial="initial"
      animate="animate"
      whileHover={{ scale: 1.02 }}
      layout
    >
      <div className="player-header">
        <div className="player-avatar" style={{ backgroundColor: player.color }}>
          <span>{player.name[0]}</span>
        </div>
        <div className="player-info">
          <h3>{player.name}</h3>
          <p className="player-status">{isCurrentPlayer ? 'Current Player' : 'Waiting'}</p>
        </div>
        {isCurrentPlayer && <FaPlay className="active-indicator" />}
      </div>
      
             <div className="player-stats">
         <div className="stat-item">
           <span className="stat-label">Position</span>
           <span className="stat-value">{player.piecePosition + 1}</span>
         </div>
         <div className="stat-item">
           <span className="stat-label">Money</span>
           <span className="stat-value money-amount">${player.money}</span>
         </div>
       </div>
      
             <motion.button 
         className={`trade-button ${hasPendingTrade || hasIncomingTrade ? 'pending-trade' : ''}`}
         onClick={() => onTrade(player.id)}
         whileHover={{ scale: 1.05 }}
         whileTap={{ scale: 0.95 }}
       >
         <FaHandshake /> 
         {hasIncomingTrade ? 'Respond to Trade' : hasPendingTrade ? 'Pending Trade' : 'Trade'}
         {(hasPendingTrade || hasIncomingTrade) && <span className="trade-notification">!</span>}
       </motion.button>
    </motion.div>
  );
};

//--- ChatSystem Component ---
interface ChatSystemProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
}
const ChatSystem: FC<ChatSystemProps> = ({ messages, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(chatBodyRef.current) {
        chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const quickEmojis = ['(dice)', '(win)', '(trade)', '(money)', '(happy)', '(fire)', '(heart)', '(party)'];

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji + ' ');
    setShowEmojiPanel(false);
  };

  return (
    <motion.div 
      className="chat-system"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="chat-header">
        <FaComments className="chat-icon" />
        <h4>Game Chat</h4>
        <motion.button
          className="emoji-toggle"
          onClick={() => setShowEmojiPanel(!showEmojiPanel)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <FaSmile />
        </motion.button>
      </div>

      <AnimatePresence>
        {showEmojiPanel && (
          <motion.div 
            className="emoji-panel"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {quickEmojis.map((emoji, index) => (
              <motion.button
                key={emoji}
                className="emoji-button"
                onClick={() => addEmoji(emoji)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.8 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {parseEmojiShortcuts(emoji)}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat-body" ref={chatBodyRef}>
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div 
              key={msg.id} 
              className="chat-message"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              transition={{ delay: index * 0.1 }}
            >
              <strong style={{ color: msg.playerColor }}>{msg.playerName}:</strong>
              <span>{parseEmojiShortcuts(msg.text)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="chat-placeholder">
            <FaComments />
            <p>Chat messages will appear here.</p>
            <p>Try typing: {quickEmojis.slice(0, 4).join(' ')}</p>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message... Use (emoji) shortcuts!"
        />
        <motion.button 
          type="submit"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <IoSend />
        </motion.button>
      </form>
    </motion.div>
  );
};

//--- TradeModal Component ---
interface TradeModalProps {
    offer: TradeOffer | null;
    players: Record<PlayerId, Player>;
    currentPlayerId: PlayerId;
    onClose: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onSendOffer: (amount: number, message: string) => void;
}
const TradeModal: FC<TradeModalProps> = ({ offer, players, currentPlayerId, onClose, onAccept, onDecline, onSendOffer }) => {
    const [tradeAmount, setTradeAmount] = useState(50);
    const [tradeMessage, setTradeMessage] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    
    // Reset form when offer changes
    useEffect(() => {
      if (offer) {
        setTradeAmount(offer.amount);
        setTradeMessage(offer.message);
        setIsConfirming(false);
      }
    }, [offer]);
    
    if (!offer) return null;
    
    const fromPlayer = players[offer.fromPlayerId];
    const toPlayer = players[offer.toPlayerId];
    const isReceiver = currentPlayerId === offer.toPlayerId;
    const isSender = currentPlayerId === offer.fromPlayerId;
    

    
    const handleConfirmSend = () => {
      onSendOffer(tradeAmount, tradeMessage);
      // Reset form and close immediately
      setTradeAmount(50);
      setTradeMessage('');
      setIsConfirming(false);
      onClose();
    };

    return (
        <AnimatePresence>
            <motion.div 
                className="modal-overlay" 
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                                 <motion.div 
                     className="modal-content" 
                     onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    variants={scaleIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.button 
                        className="modal-close-button" 
                        onClick={onClose}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <IoClose />
                    </motion.button>
                    
                    <div className="modal-header">
                        <FaHandshake className="modal-icon" />
                        <h2>
                          {isReceiver && offer.status === 'sent' ? 'Incoming Trade Offer' : 
                           isSender && offer.status === 'sent' ? 'Trade Offer Sent' :
                           'Send Trade Offer'}
                        </h2>
                    </div>
                    
                    <div className="trade-players">
                        <div className="trade-player">
                            <div className="player-avatar" style={{ backgroundColor: fromPlayer.color }}>
                                {fromPlayer.name[0]}
                            </div>
                            <h3>{fromPlayer.name}</h3>
                            <p>Initiating Trade</p>
                        </div>
                        
                        <motion.div 
                            className="trade-arrow"
                            animate={{ rotate: [0, 180, 360] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <IoSwapHorizontal />
                        </motion.div>
                        
                        <div className="trade-player">
                            <div className="player-avatar" style={{ backgroundColor: toPlayer.color }}>
                                {toPlayer.name[0]}
                            </div>
                            <h3>{toPlayer.name}</h3>
                            <p>Receiving Offer</p>
                        </div>
                    </div>
                    
                    <div className="trade-details">
                        <h4>Trade Details</h4>
                        
                        {isSender && offer.status === 'draft' && (
                          <>
                            <div className="trade-item">
                                <label>
                                    <span>💰 Money Amount:</span>
                                    <input 
                                        type="range" 
                                        min="10" 
                                        max={Math.min(100, fromPlayer.money)} 
                                        value={tradeAmount}
                                        onChange={(e) => setTradeAmount(Number(e.target.value))}
                                    />
                                    <span className="amount-display">${tradeAmount}</span>
                                </label>
                            </div>
                            
                            <div className="trade-item">
                                <label>
                                    <span>💬 Trade Message:</span>
                                    <input 
                                        type="text"
                                        placeholder="Optional message..."
                                        value={tradeMessage}
                                        onChange={(e) => setTradeMessage(e.target.value)}
                                    />
                                </label>
                            </div>
                          </>
                        )}
                        
                        <div className="trade-preview">
                            {isReceiver && offer.status === 'sent' ? (
                              <>
                                <p><strong>{fromPlayer.name}</strong> wants to send <strong>${offer.amount}</strong> to <strong>you</strong></p>
                                {offer.message && <p className="trade-note">Message: "{parseEmojiShortcuts(offer.message)}"</p>}
                                <p className="trade-note">Do you want to accept this trade?</p>
                              </>
                            ) : isSender && offer.status === 'sent' ? (
                              <>
                                <p>You sent a trade offer of <strong>${offer.amount}</strong> to <strong>{toPlayer.name}</strong></p>
                                {offer.message && <p className="trade-note">Message: "{parseEmojiShortcuts(offer.message)}"</p>}
                                <p className="trade-note">Waiting for {toPlayer.name} to respond on their turn...</p>
                              </>
                            ) : isSender && offer.status === 'draft' ? (
                              <>
                                <p>You will send <strong>${tradeAmount}</strong> to <strong>{toPlayer.name}</strong></p>
                                {tradeMessage && <p className="trade-note">Message: "{parseEmojiShortcuts(tradeMessage)}"</p>}
                              </>
                            ) : (
                              <p><strong>{fromPlayer.name}</strong> offers <strong>${offer.amount}</strong> to <strong>{toPlayer.name}</strong></p>
                            )}
                        </div>
                    </div>
                    
                                         <div className="modal-actions">
                         {isReceiver && offer.status === 'sent' ? (
                           // Receiving player can accept or decline
                           <>
                             <motion.button 
                                 onClick={onDecline} 
                                 className="cancel"
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                             >
                                 ❌ Decline
                             </motion.button>
                             <motion.button 
                                 onClick={onAccept}
                                 className="confirm"
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                             >
                                  <FaHandshake /> Accept Trade
                             </motion.button>
                           </>
                         ) : isSender && offer.status === 'sent' ? (
                           // Sending player sees the sent offer - can only close
                           <motion.button 
                               onClick={onClose} 
                               className="cancel"
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                           >
                               Close
                           </motion.button>
                         ) : isSender && offer.status === 'draft' ? (
                           // Sending player can send or cancel
                           <>
                             <motion.button 
                                 onClick={onClose} 
                                 className="cancel"
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                             >
                                 Cancel
                             </motion.button>
                             <motion.button 
                                 onClick={handleConfirmSend}
                                 className="confirm"
                                 whileHover={{ scale: 1.05 }}
                                 whileTap={{ scale: 0.95 }}
                                 disabled={tradeAmount > fromPlayer.money}
                             >
                                  📤 Send Trade Offer
                             </motion.button>
                           </>
                         ) : (
                           // Just close button for other states
                           <motion.button 
                               onClick={onClose} 
                               className="cancel"
                               whileHover={{ scale: 1.05 }}
                               whileTap={{ scale: 0.95 }}
                           >
                               Close
                           </motion.button>
                         )}
                     </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};


//================================================================================
// 5. MAIN APP COMPONENT
//================================================================================
const App: FC = () => {
  const isMobile = useIsMobile();
  const BOARD_DIMENSION = isMobile ? MOBILE_BOARD_SIZE : DESKTOP_BOARD_SIZE;
  const totalSquares = BOARD_DIMENSION * BOARD_DIMENSION;

  const [players, setPlayers] = useState<Record<PlayerId, Player>>(INITIAL_PLAYERS);
  const [currentPlayerId, setCurrentPlayerId] = useState<PlayerId>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [squareSize, setSquareSize] = useState(0);
  const [tradeOffer, setTradeOffer] = useState<TradeOffer | null>(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [moneySquares, setMoneySquares] = useState<MoneySquare[]>([]);
  const [gameNumber, setGameNumber] = useState(1);
  const [turnNumber, setTurnNumber] = useState(1);
  
  const boardRef = useRef<HTMLDivElement>(null);

  // Calculate square size for piece positioning
  useEffect(() => {
    const calculateSquareSize = () => {
      if (boardRef.current) {
        setSquareSize(boardRef.current.clientWidth / BOARD_DIMENSION);
      }
    };
    calculateSquareSize();
    window.addEventListener('resize', calculateSquareSize);
    return () => window.removeEventListener('resize', calculateSquareSize);
  }, [BOARD_DIMENSION]);

  // Initialize money squares
  useEffect(() => {
    setMoneySquares(generateMoneySquares(totalSquares));
  }, [totalSquares, gameNumber]);

  const addSystemMessage = useCallback((text: string) => {
    setMessages(prev => [
        ...prev,
        { id: Date.now(), playerName: 'System', playerColor: CALM_BLUE_PALETTE.dark, text }
    ]);
  }, []);

  const [isRolling, setIsRolling] = useState(false);

  const handleRollDice = useCallback(() => {
    if(isGameOver || isRolling) return;
    
    setIsRolling(true);
    
    // Simulate dice rolling animation
    const rollAnimation = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * 6) + 1);
    }, 100);
    
    setTimeout(() => {
      clearInterval(rollAnimation);
      const finalRoll = Math.floor(Math.random() * 6) + 1;
      setDiceResult(finalRoll);
      setIsRolling(false);
      addSystemMessage(`${players[currentPlayerId].name} rolled a ${finalRoll} (dice)`);

      setPlayers(prevPlayers => {
          const currentPlayer = prevPlayers[currentPlayerId];
          const newPosition = Math.min(currentPlayer.piecePosition + finalRoll, totalSquares - 1);
          
          // Check for money collection
          const moneySquare = moneySquares.find(ms => ms.position === newPosition && !ms.collected);
          let updatedPlayer = { ...currentPlayer, piecePosition: newPosition };
          
          if (moneySquare) {
            updatedPlayer.money += moneySquare.amount;
            addSystemMessage(`${currentPlayer.name} collected $${moneySquare.amount}! (money)`);
            setMoneySquares(prev => prev.map(ms => 
              ms.position === newPosition ? { ...ms, collected: true } : ms
            ));
          }

          if (newPosition >= totalSquares - 1) {
              setIsGameOver(true);
              updatedPlayer.money += 20; // Winner prize
              addSystemMessage(`${currentPlayer.name} has won the game and earned $20 prize! (win) (party)`);
          }
          
          return {
              ...prevPlayers,
              [currentPlayerId]: updatedPlayer
          };
      });
    }, 1000);
  }, [currentPlayerId, players, totalSquares, isGameOver, isRolling, addSystemMessage]);

  const handleEndTurn = () => {
    if(isGameOver) return;
    setCurrentPlayerId(prevId => (prevId === 1 ? 2 : 1));
    setDiceResult(null);
    setTurnNumber(prev => prev + 1);
  };
  
  const handleSendMessage = (text: string) => {
    const currentPlayer = players[currentPlayerId];
    const newMessage: ChatMessage = {
      id: Date.now(),
      playerName: currentPlayer.name,
      playerColor: currentPlayer.color,
      text: text,
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  const handleInitiateTrade = (targetPlayerId: PlayerId) => {
    console.log('handleInitiateTrade called:', {
      targetPlayerId,
      currentPlayerId,
      tradeOffer,
      hasIncomingTrade: tradeOffer && tradeOffer.toPlayerId === currentPlayerId && tradeOffer.status === 'sent'
    });
    
    // Special case: If clicking on your own trade button, check for incoming trades
    if (targetPlayerId === currentPlayerId) {
      // Check if there's a trade offer TO this player that they need to respond to
      if (tradeOffer && tradeOffer.toPlayerId === currentPlayerId && tradeOffer.status === 'sent') {
        console.log('Opening modal for incoming trade response');
        // Force modal to show for incoming trade response
        setShowTradeModal(true);
        return;
      }
      
      // If no incoming trade, show the "can't trade with yourself" message
      console.log('No incoming trade, showing error message');
      addSystemMessage("You can't trade with yourself!");
      return;
    }
    
    // Check if there's already an active trade offer FROM this player
    if (tradeOffer && tradeOffer.fromPlayerId === currentPlayerId && (tradeOffer.status === 'draft' || tradeOffer.status === 'sent')) {
      addSystemMessage("You already have an active trade offer!");
      return;
    }
    
    // Check if there's a pending trade offer that hasn't been responded to
    if (tradeOffer && tradeOffer.status === 'sent') {
      addSystemMessage("There's already a pending trade offer. Wait for it to be resolved!");
      return;
    }
    
    // Create new trade offer in draft mode
    const newTradeOffer: TradeOffer = {
      id: Date.now(),
      fromPlayerId: currentPlayerId,
      toPlayerId: targetPlayerId,
      amount: 50,
      message: '',
      status: 'draft',
      createdTurn: turnNumber
    };
    setTradeOffer(newTradeOffer);
    setShowTradeModal(true);
  };
  
  const handleAcceptTrade = () => {
    if(tradeOffer) {
        const fromPlayer = players[tradeOffer.fromPlayerId];
        const toPlayer = players[tradeOffer.toPlayerId];
        
        if (fromPlayer.money < tradeOffer.amount) {
          addSystemMessage(`${fromPlayer.name} doesn't have enough money for this trade! (sad)`);
          setTradeOffer(null);
          setShowTradeModal(false);
          return;
        }
        
        setPlayers(prev => ({
          ...prev,
          [tradeOffer.fromPlayerId]: { ...fromPlayer, money: fromPlayer.money - tradeOffer.amount },
          [tradeOffer.toPlayerId]: { ...toPlayer, money: toPlayer.money + tradeOffer.amount }
        }));
        
        addSystemMessage(`${fromPlayer.name} sent $${tradeOffer.amount} to ${toPlayer.name}! (trade) (money)`);
        setTradeOffer(null);
        setShowTradeModal(false);
    }
  };
  
  const handleDeclineTrade = () => {
    if(tradeOffer) {
      addSystemMessage(`${players[tradeOffer.toPlayerId].name} declined the trade offer from ${players[tradeOffer.fromPlayerId].name}. (sad)`);
      setTradeOffer(null);
      setShowTradeModal(false);
    }
  };

  const handleSendTradeOffer = (amount: number, message: string) => {
    if(tradeOffer && tradeOffer.status === 'draft') {
      const updatedOffer = { ...tradeOffer, amount, message, status: 'sent' as const };
      setTradeOffer(updatedOffer);
      setShowTradeModal(false);
      // Send chat message when trade is sent
      addSystemMessage(`${players[tradeOffer.fromPlayerId].name} sent a trade offer of $${amount} to ${players[tradeOffer.toPlayerId].name}! (trade)`);
    }
  };

  const handleRematch = () => {
    const player1 = players[1];
    const player2 = players[2];
    
    if (player1.money < 25) {
      addSystemMessage(`${player1.name} doesn't have enough money for rematch ($25 required). ${player2.name} wins! (win)`);
      return;
    }
    
    if (player2.money < 25) {
      addSystemMessage(`${player2.name} doesn't have enough money for rematch ($25 required). ${player1.name} wins! (win)`);
      return;
    }
    
    // Deduct $25 from each player
    setPlayers(prev => ({
      ...prev,
      1: { ...prev[1], piecePosition: 0, money: prev[1].money - 25 },
      2: { ...prev[2], piecePosition: 0, money: prev[2].money - 25 }
    }));
    
    setCurrentPlayerId(1);
    setDiceResult(null);
    setIsGameOver(false);
    setGameNumber(prev => prev + 1);
    setTurnNumber(1);
    setTradeOffer(null); // Clear any pending trades
    setShowTradeModal(false);
    addSystemMessage("New game started! Each player paid $25 entry fee. (party)");
  };

  // Check if any player has $0
  useEffect(() => {
    const player1 = players[1];
    const player2 = players[2];
    
    if (player1.money <= 0 && player2.money <= 0) {
      addSystemMessage("Both players are out of money! Game over! (sad)");
      setIsGameOver(true);
    } else if (player1.money <= 0) {
      addSystemMessage(`${player1.name} is out of money! ${player2.name} wins the tournament! (win)`);
      setIsGameOver(true);
    } else if (player2.money <= 0) {
      addSystemMessage(`${player2.name} is out of money! ${player1.name} wins the tournament! (win)`);
      setIsGameOver(true);
    }
  }, [players, addSystemMessage]);

  const swipeHandlers = useSwipe((direction) => {
      addSystemMessage(`Swiped ${direction}! Rolling dice...`);
      handleRollDice();
  });
  
  const boardSquares = Array.from({ length: totalSquares }, (_, i) => i);
  const player1 = players[1];
  const player2 = players[2];
  


  return (
    <>
      {/* Modern Enhanced CSS Styles */}
      <style>{`
        :root {
          --color-bg: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
          --color-light: ${CALM_BLUE_PALETTE.light};
          --color-medium: ${CALM_BLUE_PALETTE.medium};
          --color-text: ${CALM_BLUE_PALETTE.text};
          --color-dark: ${CALM_BLUE_PALETTE.dark};
          --font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
          --border-radius: 12px;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.1);
          --shadow-md: 0 4px 20px rgba(0,0,0,0.15);
          --shadow-lg: 0 8px 32px rgba(0,0,0,0.2);
          --gradient-primary: linear-gradient(135deg, var(--color-medium), var(--color-light));
          --gradient-secondary: linear-gradient(135deg, var(--color-dark), var(--color-text));
        }
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          font-family: var(--font-family);
          background: var(--color-bg);
          color: var(--color-dark);
          overscroll-behavior: none;
          min-height: 100vh;
        }
        .main-container {
          display: grid;
          grid-template-columns: 250px 1fr 250px;
          grid-template-rows: 1fr auto;
          grid-template-areas:
            "p1 board p2"
            "chat chat chat";
          height: 100vh;
          width: 100%;
          gap: 20px;
          padding: 20px;
          box-sizing: border-box;
          max-width: 1400px;
          margin: 0 auto;
        }
        .game-area {
          grid-area: board;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .game-board {
          display: grid;
          width: 100%;
          max-width: 600px;
          aspect-ratio: 1 / 1;
          border: 4px solid var(--color-text);
          background: linear-gradient(45deg, #ffffff 25%, #f8fbff 25%, #f8fbff 50%, #ffffff 50%, #ffffff 75%, #f8fbff 75%, #f8fbff);
          background-size: 20px 20px;
          position: relative;
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .board-square {
          border: 1px solid var(--color-light);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: var(--color-text);
          font-weight: bold;
          background: rgba(255,255,255,0.8);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          padding: 4px;
          position: relative;
        }
        .board-square:hover {
          background: rgba(255,255,255,0.95);
          transform: scale(1.02);
        }
        .game-piece {
          position: absolute;
          top: 0;
          left: 0;
          width: calc(100% / ${BOARD_DIMENSION} * 0.7);
          height: calc(100% / ${BOARD_DIMENSION} * 0.7);
          border-radius: 50%;
          margin: calc(100% / ${BOARD_DIMENSION} * 0.15);
          border: 4px solid white;
          box-shadow: var(--shadow-md);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .piece-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: inherit;
          position: relative;
          overflow: hidden;
        }
        .piece-label {
          color: white;
          font-weight: bold;
          font-size: calc(100% / ${BOARD_DIMENSION} * 0.5);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .square-number {
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .money-indicator {
          font-size: 0.7rem;
          background: #FFD700;
          color: #333;
          padding: 2px 4px;
          border-radius: 4px;
          font-weight: bold;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          animation: coinGlow 2s infinite;
        }
        @keyframes coinGlow {
          0%, 100% { box-shadow: 0 1px 3px rgba(0,0,0,0.3); }
          50% { box-shadow: 0 1px 8px rgba(255,215,0,0.6); }
        }
        .money-amount {
          color: #4CAF50 !important;
          font-weight: bold;
        }
        .controls {
          margin-top: 20px;
          display: flex;
          gap: 15px;
        }
        button {
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: var(--border-radius);
          background: var(--gradient-primary);
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s;
        }
        button:hover:before {
          left: 100%;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        button:active {
          transform: translateY(0);
          box-shadow: var(--shadow-sm);
        }
        button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        button:disabled:before {
          display: none;
        }
        .player-panel {
          grid-area: p1;
          padding: 20px;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(15px);
          border-radius: var(--border-radius);
          border: 3px solid var(--color-text);
          transition: all 0.3s ease;
          box-shadow: var(--shadow-sm);
        }
        .player-panel.p2 {
          grid-area: p2;
        }
        .player-panel.active {
          transform: translateY(-8px);
          box-shadow: var(--shadow-lg);
          border-color: var(--color-medium) !important;
          background: rgba(255,255,255,1);
        }
        .player-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          position: relative;
        }
        .player-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
          box-shadow: var(--shadow-sm);
          border: 3px solid white;
        }
        .player-info h3 {
          margin: 0;
          font-size: 1.3rem;
          color: var(--color-dark);
        }
        .player-status {
          margin: 4px 0 0 0;
          font-size: 0.9rem;
          color: var(--color-text);
          font-weight: 500;
        }
        .active-indicator {
          color: #4CAF50;
          font-size: 1.2rem;
          margin-left: auto;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .player-stats {
          margin: 16px 0;
          padding: 12px;
          background: rgba(var(--color-light), 0.1);
          border-radius: 8px;
        }
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stat-label {
          font-size: 0.9rem;
          color: var(--color-text);
        }
        .stat-value {
          font-weight: bold;
          color: var(--color-dark);
          font-size: 1.1rem;
        }
        .trade-button {
          width: 100%;
          margin-top: 12px;
          position: relative;
        }
        .trade-button.pending-trade {
          background: linear-gradient(135deg, #ff6b6b, #ff8e53);
          animation: pulseGlow 2s infinite;
        }
        .trade-notification {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff4757;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          animation: bounce 1s infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(255,107,107,0.5); }
          50% { box-shadow: 0 0 20px rgba(255,107,107,0.8); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-3px); }
          60% { transform: translateY(-1px); }
        }
        .chat-system {
          grid-area: chat;
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(15px);
          border-radius: var(--border-radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          border: 2px solid var(--color-text);
          max-height: 30vh;
          box-shadow: var(--shadow-md);
        }
        .chat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--color-light);
        }
        .chat-icon {
          color: var(--color-medium);
          font-size: 1.3rem;
        }
        .chat-header h4 {
          margin: 0;
          color: var(--color-dark);
          font-size: 1.2rem;
        }
        .emoji-toggle {
          margin-left: auto;
          padding: 8px;
          font-size: 1.1rem;
          min-width: auto;
        }
        .emoji-panel {
          display: flex;
          gap: 8px;
          padding: 12px;
          background: rgba(var(--color-light), 0.1);
          border-radius: 8px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .emoji-button {
          padding: 8px;
          font-size: 1.2rem;
          min-width: auto;
          background: transparent;
          border: 2px solid var(--color-light);
          border-radius: 8px;
        }
        .emoji-button:hover {
          background: var(--color-light);
          transform: scale(1.2);
        }
        .chat-body {
          flex-grow: 1;
          overflow-y: auto;
          margin-bottom: 12px;
          padding-right: 8px;
          scrollbar-width: thin;
          scrollbar-color: var(--color-light) transparent;
        }
        .chat-body::-webkit-scrollbar {
          width: 6px;
        }
        .chat-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-body::-webkit-scrollbar-thumb {
          background: var(--color-light);
          border-radius: 3px;
        }
        .chat-message {
          margin-bottom: 8px;
          word-wrap: break-word;
          padding: 8px 12px;
          background: rgba(var(--color-light), 0.1);
          border-radius: 12px;
          border-left: 3px solid var(--color-medium);
        }
        .chat-message span {
          margin-left: 8px;
          color: var(--color-dark);
        }
        .chat-placeholder {
          text-align: center;
          color: var(--color-text);
          font-style: italic;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .chat-placeholder svg {
          font-size: 2rem;
          opacity: 0.5;
        }
        .chat-form {
          display: flex;
        }
        .chat-form input {
          flex-grow: 1;
          padding: 8px;
          border: 1px solid var(--color-text);
          border-radius: var(--border-radius) 0 0 var(--border-radius);
          outline: none;
        }
        .chat-form button {
          border-radius: 0 var(--border-radius) var(--border-radius) 0;
        }
        
        /* ENHANCED MODAL STYLES */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          padding: 32px;
          border-radius: 20px;
          max-width: 600px;
          width: 90%;
          box-shadow: var(--shadow-lg);
          position: relative;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .modal-close-button {
          position: absolute;
          top: 16px;
          right: 16px;
          background: transparent;
          color: var(--color-text);
          font-size: 1.5rem;
          padding: 8px;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--color-light);
        }
        .modal-icon {
          font-size: 2rem;
          color: var(--color-medium);
        }
        .trade-players {
          display: flex;
          align-items: center;
          justify-content: space-around;
          margin: 24px 0;
          padding: 20px;
          background: rgba(var(--color-light), 0.1);
          border-radius: 16px;
        }
        .trade-player {
          text-align: center;
        }
        .trade-player h3 {
          margin: 8px 0 4px 0;
          color: var(--color-dark);
        }
        .trade-player p {
          margin: 0;
          color: var(--color-text);
          font-size: 0.9rem;
        }
        .trade-arrow {
          font-size: 2rem;
          color: var(--color-medium);
        }
        .trade-details h4 {
          color: var(--color-dark);
          margin-bottom: 16px;
        }
        .trade-item {
          margin-bottom: 16px;
        }
        .trade-item label {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .trade-item span {
          font-weight: 600;
          color: var(--color-dark);
        }
        .trade-item input[type="range"] {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          background: var(--color-light);
          outline: none;
        }
        .trade-item input[type="text"] {
          padding: 12px;
          border: 2px solid var(--color-light);
          border-radius: 8px;
          font-size: 1rem;
        }
        .amount-display {
          font-size: 1.2rem;
          font-weight: bold;
          color: var(--color-medium);
        }
        .trade-preview {
          padding: 16px;
          background: rgba(var(--color-medium), 0.1);
          border-radius: 12px;
          border-left: 4px solid var(--color-medium);
        }
        .trade-note {
          font-style: italic;
          color: var(--color-text);
          margin-top: 8px;
        }
        .modal-actions {
          margin-top: 24px;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .modal-actions button.cancel {
          background: #e0e0e0;
          color: var(--color-dark);
        }
        .modal-actions button.cancel:hover {
          background: #d0d0d0;
        }
        .modal-actions button.confirm {
          background: var(--gradient-primary);
        }

        /* MOBILE LAYOUT */
        @media (max-width: 767px) {
          .main-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr auto;
            grid-template-areas:
              "panels"
              "board"
              "chat";
            height: auto;
            min-height: 100vh;
            padding: 10px;
            gap: 10px;
          }
          .player-panels-container {
            grid-area: panels;
            display: flex;
            justify-content: space-around;
            gap: 10px;
          }
          .player-panel { flex: 1; text-align: center; }
          .game-board { max-width: 100%; }
          .chat-system { max-height: 200px; }
          .controls {
            position: fixed;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.9);
            padding: 10px;
            border-radius: var(--border-radius);
            box-shadow: 0 0 15px rgba(0,0,0,0.2);
            z-index: 50;
            width: calc(100% - 40px);
            justify-content: space-around;
          }
          .game-area {
            /* Add touch handlers for swipe gesture */
          }
        }
      `}</style>
      <div className="main-container">
        {isMobile ? (
          <div className="player-panels-container">
            <PlayerPanel 
              player={player1} 
              isCurrentPlayer={currentPlayerId === 1} 
              onTrade={handleInitiateTrade} 
              hasPendingTrade={tradeOffer?.fromPlayerId === 1 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 1 && tradeOffer?.status === 'sent' && currentPlayerId === 1}
            />
            <PlayerPanel 
              player={player2} 
              isCurrentPlayer={currentPlayerId === 2} 
              onTrade={handleInitiateTrade} 
              hasPendingTrade={tradeOffer?.fromPlayerId === 2 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 2 && tradeOffer?.status === 'sent' && currentPlayerId === 2}
            />
          </div>
        ) : (
          <>
            <PlayerPanel 
              player={player1} 
              isCurrentPlayer={currentPlayerId === 1} 
              onTrade={handleInitiateTrade} 
              hasPendingTrade={tradeOffer?.fromPlayerId === 1 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 1 && tradeOffer?.status === 'sent' && currentPlayerId === 1}
            />
            <PlayerPanel 
              player={player2} 
              isCurrentPlayer={currentPlayerId === 2} 
              onTrade={handleInitiateTrade} 
              className="p2" 
              hasPendingTrade={tradeOffer?.fromPlayerId === 2 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 2 && tradeOffer?.status === 'sent' && currentPlayerId === 2}
            />
          </>
        )}
        
        <motion.div 
          className="game-area" 
          {...(isMobile ? swipeHandlers : {})}
          variants={fadeInUp}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence>
            {isMobile && !isGameOver && (
              <motion.p 
                style={{textAlign: "center", color: CALM_BLUE_PALETTE.dark, marginBottom: "16px"}}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                👆 Swipe up on the board to roll the dice!
              </motion.p>
            )}
            
            {isGameOver && (
              <motion.div 
                style={{textAlign: "center", marginBottom: "20px"}}
                variants={scaleIn}
                initial="initial"
                animate="animate"
              >
                <h2 style={{color: "#4CAF50", margin: "0", fontSize: "2rem"}}>
                  <FaTrophy style={{marginRight: "12px"}} />
                  {players[player1.piecePosition === totalSquares - 1 ? 1: 2].name} Wins!
                </h2>
                <p style={{color: CALM_BLUE_PALETTE.text, margin: "8px 0"}}>🎉 Congratulations! 🎉</p>
                <motion.button
                  onClick={handleRematch}
                  style={{marginTop: "16px"}}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaPlay /> Play Again ($25 each)
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
          
          <motion.div
            className="game-board"
            ref={boardRef}
            style={{ gridTemplateColumns: `repeat(${BOARD_DIMENSION}, 1fr)` }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {boardSquares.map((i) => {
              const moneySquare = moneySquares.find(ms => ms.position === i);
              return (
                <motion.div key={i}>
                  <BoardSquare index={i} moneySquare={moneySquare} />
                </motion.div>
              );
            })}
            <GamePiece player={player1} boardSize={BOARD_DIMENSION} squareSize={squareSize} />
            <GamePiece player={player2} boardSize={BOARD_DIMENSION} squareSize={squareSize} />
          </motion.div>

          {!isMobile && (
            <motion.div 
              className="controls"
              variants={fadeInUp}
              initial="initial"
              animate="animate"
            >
              <motion.button 
                onClick={handleRollDice} 
                disabled={diceResult !== null || isGameOver || isRolling}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {isRolling ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    >
                      {diceResult && React.createElement(getDiceIcon(diceResult))}
                    </motion.span>
                    Rolling...
                  </>
                ) : diceResult ? (
                  <>
                    {React.createElement(getDiceIcon(diceResult))}
                    Rolled: {diceResult}
                  </>
                ) : (
                  <>
                    <FaGamepad />
                    Roll Dice
                  </>
                )}
              </motion.button>
              
              <motion.button 
                onClick={handleEndTurn} 
                disabled={diceResult === null || isGameOver}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaPlay />
                End Turn
              </motion.button>
            </motion.div>
          )}
        </motion.div>

        {isMobile && (
          <motion.div 
            className="controls"
            variants={fadeInUp}
            initial="initial"
            animate="animate"
          >
            <motion.button 
              onClick={handleRollDice} 
              disabled={diceResult !== null || isGameOver || isRolling}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isRolling ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  >
                    {diceResult && React.createElement(getDiceIcon(diceResult))}
                  </motion.span>
                  Rolling
                </>
              ) : diceResult ? (
                <>
                  {React.createElement(getDiceIcon(diceResult))}
                  {diceResult}
                </>
              ) : (
                <>
                  <FaGamepad />
                  Roll
                </>
              )}
            </motion.button>
            
            <motion.button 
              onClick={handleEndTurn} 
              disabled={diceResult === null || isGameOver}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaPlay />
              End Turn
            </motion.button>
          </motion.div>
        )}

        <ChatSystem messages={messages} onSendMessage={handleSendMessage} />
      </div>

      {showTradeModal && (
        <TradeModal 
          offer={tradeOffer}
          players={players}
          currentPlayerId={currentPlayerId}
          onClose={() => setShowTradeModal(false)}
          onAccept={handleAcceptTrade}
          onDecline={handleDeclineTrade}
          onSendOffer={handleSendTradeOffer}
        />
      )}
    </>
  );
};

export default App;