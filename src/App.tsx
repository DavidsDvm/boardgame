import React, { useState, useEffect, useRef, useCallback } from 'react';
import { type FC, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaDiceOne, FaDiceTwo, FaDiceThree, FaDiceFour, FaDiceFive, FaDiceSix,
  FaGamepad, FaComments, FaHandshake, FaTrophy, FaPlay,
  FaPause, FaVolumeUp, FaVolumeMute, FaCog, FaPaperPlane,
  FaSmile, FaLaugh, FaHeart, FaFire, FaStar, FaInfoCircle,
  FaArrowRight, FaCheckCircle, FaTimes, FaCoins, FaUsers,
  FaArrowDown, FaArrowUp, FaMousePointer
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
  isGameOver?: boolean;
}
const PlayerPanel: FC<PlayerPanelProps> = ({ player, isCurrentPlayer, onTrade, className, hasPendingTrade, hasIncomingTrade, isGameOver }) => {
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
         disabled={isGameOver}
         whileHover={!isGameOver ? { scale: 1.05 } : {}}
         whileTap={!isGameOver ? { scale: 0.95 } : {}}
       >
         <FaHandshake /> 
         {isGameOver ? 'Game Over' : hasIncomingTrade ? 'Respond to Trade' : hasPendingTrade ? 'Pending Trade' : 'Trade'}
         {(hasPendingTrade || hasIncomingTrade) && !isGameOver && <span className="trade-notification">!</span>}
       </motion.button>
    </motion.div>
  );
};

//--- ChatSystem Component ---
interface ChatSystemProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  isMobile?: boolean;
}
const ChatSystem: FC<ChatSystemProps> = ({ messages, onSendMessage, isFullScreen = false, onToggleFullScreen, isMobile = false }) => {
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
      className={`chat-system ${isFullScreen ? 'chat-fullscreen' : ''}`}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
    >
      <div className="chat-header">
        <FaComments className="chat-icon" />
        <h4>Game Chat</h4>
        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
          {isMobile && onToggleFullScreen && (
            <motion.button
              className="fullscreen-toggle"
              onClick={onToggleFullScreen}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={isFullScreen ? "Exit fullscreen" : "Fullscreen chat"}
            >
              {isFullScreen ? "🗙" : "⛶"}
            </motion.button>
          )}
          <motion.button
            className="emoji-toggle"
            onClick={() => setShowEmojiPanel(!showEmojiPanel)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <FaSmile />
          </motion.button>
        </div>
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
    onCancel?: () => void;
    onAccept: () => void;
    onDecline: () => void;
    onSendOffer: (amount: number, message: string) => void;
}
const TradeModal: FC<TradeModalProps> = ({ offer, players, currentPlayerId, onClose, onCancel, onAccept, onDecline, onSendOffer }) => {
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
                                 onClick={onCancel || onClose} 
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

//--- Interactive Tutorial Component ---
interface InteractiveTutorialProps {
  step: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  isMobile: boolean;
  boardRef: React.RefObject<HTMLDivElement | null>;
  totalSquares: number;
}

const InteractiveTutorial: FC<InteractiveTutorialProps> = ({ 
  step, 
  onNext, 
  onPrev, 
  onClose, 
  isMobile,
  boardRef,
  totalSquares
}) => {
  const [highlightBounds, setHighlightBounds] = useState<DOMRect | null>(null);
  const [arrowPosition, setArrowPosition] = useState<{x: number, y: number} | null>(null);

  const tutorialSteps = [
    {
      title: "Welcome to Board Game Adventure! 🎲",
      content: "This is a 2-player strategic board game. Let me show you how everything works!",
      highlight: "",
      arrow: "",
      position: "center"
    },
    {
      title: "Game Objective 🏆",
      content: `Your goal is to be the first player to reach position ${totalSquares} (the last square) and win $50! You can also win if your opponent runs out of money.`,
      highlight: "",
      arrow: "",
      position: "center"
    },
    {
      title: "Starting Money 💰",
      content: "Each player starts with $100. Each game costs $25 to play. Look at your money in the player panel!",
      highlight: ".player-panel",
      arrow: "left",
      position: "right"
    },
    {
      title: "The Game Board 🗺️",
      content: `This is the game board with ${totalSquares} positions. You start at position 1 and need to reach position ${totalSquares}.`,
      highlight: ".game-board",
      arrow: "top",
      position: "bottom"
    },
    {
      title: "Your Game Piece 👤",
      content: "These colored circles are your game pieces. Each player has a different color and starts at position 1.",
      highlight: ".game-piece",
      arrow: "top",
      position: "bottom"
    },
    {
      title: "Money Squares 💎",
      content: "Some squares have money on them! When you land on these, you collect the bonus money shown.",
      highlight: ".money-indicator",
      arrow: "top",
      position: "bottom"
    },
    {
      title: "Rolling the Dice 🎲",
      content: `${isMobile ? "Swipe up on the board or tap the 'Roll' button" : "Click the 'Roll Dice' button"} to move 1-${isMobile ? '4' : '6'} spaces forward. You can only move on your turn!`,
      highlight: isMobile ? ".controls button:first-child" : ".controls button:first-child",
      arrow: "top",
      position: "bottom"
    },
    {
      title: "Player Trading 🤝",
      content: "You can send money to your opponent! Click their 'Trade' button to make an offer. This can be strategic!",
      highlight: ".trade-button",
      arrow: "right",
      position: "bottom"
    },
    {
      title: "Chat System 💬",
      content: `${isMobile ? "Tap the chat button to communicate" : "Use the chat panel"} to talk with your opponent. Try typing emoji shortcuts like (dice) (win) (money)!`,
      highlight: isMobile ? ".floating-chat-button" : ".chat-system",
      arrow: isMobile ? "left" : "bottom",
      position: isMobile ? "right" : "top"
    },
    {
      title: "Winning the Game 🏅",
      content: `Reach position ${totalSquares} to win $50! Keep playing rounds until someone can't afford the $25 entry fee. Good luck!`,
      highlight: "",
      arrow: "",
      position: "center"
    }
  ];

  useEffect(() => {
    const updateHighlight = () => {
      const currentStep = tutorialSteps[step];
      if (currentStep.highlight) {
        const element = document.querySelector(currentStep.highlight);
        if (element) {
          const bounds = element.getBoundingClientRect();
          setHighlightBounds(bounds);
          
          // Calculate arrow position based on element position
          let arrowX = bounds.left + bounds.width / 2;
          let arrowY = bounds.top + bounds.height / 2;
          
          if (currentStep.arrow === 'top') {
            arrowY = bounds.top - 40;
          } else if (currentStep.arrow === 'bottom') {
            arrowY = bounds.bottom + 40;
          } else if (currentStep.arrow === 'left') {
            arrowX = bounds.left - 40;
          } else if (currentStep.arrow === 'right') {
            arrowX = bounds.right + 40;
          }
          
          setArrowPosition({ x: arrowX, y: arrowY });
        }
      } else {
        setHighlightBounds(null);
        setArrowPosition(null);
      }
    };

    updateHighlight();
    
    // Update on resize
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [step, tutorialSteps]);

  const currentStep = tutorialSteps[step];
  const isLastStep = step === tutorialSteps.length - 1;
  const isFirstStep = step === 0;

  // Calculate smart positioning for tutorial card
  const getCardPosition = (position: string, bounds: DOMRect | null, isMobile: boolean): React.CSSProperties => {
    if (!bounds) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const cardWidth = isMobile ? Math.min(350, window.innerWidth - 40) : 400;
    const cardHeight = 350; // Increased for better estimation
    const padding = 20;

    let style: React.CSSProperties = {
      position: 'fixed',
      width: cardWidth,
      maxWidth: cardWidth,
    };

    switch (position) {
      case 'top':
        style.bottom = window.innerHeight - bounds.top + padding;
        style.left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, bounds.left + bounds.width / 2 - cardWidth / 2));
        break;
      case 'bottom':
        style.top = bounds.bottom + padding;
        style.left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, bounds.left + bounds.width / 2 - cardWidth / 2));
        break;
      case 'left':
        // For left positioning, make sure we don't go off screen
        const leftPosition = Math.max(bounds.left - cardWidth - padding, padding);
        style.left = leftPosition;
        style.top = Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, bounds.top + bounds.height / 2 - cardHeight / 2));
        break;
      case 'right':
        // For right positioning, check if there's enough space, otherwise position to the left
        const rightSpace = window.innerWidth - bounds.right;
        if (rightSpace >= cardWidth + padding * 2) {
          style.left = bounds.right + padding;
        } else {
          // Not enough space on the right, position to the left
          style.left = Math.max(padding, bounds.left - cardWidth - padding);
        }
        style.top = Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, bounds.top + bounds.height / 2 - cardHeight / 2));
        break;
      default: // center
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
    }

    // Final safety check to ensure card stays on screen
    if (style.left && typeof style.left === 'number') {
      style.left = Math.max(padding, Math.min(window.innerWidth - cardWidth - padding, style.left));
    }
    if (style.top && typeof style.top === 'number') {
      style.top = Math.max(padding, Math.min(window.innerHeight - cardHeight - padding, style.top));
    }

    return style;
  };

  return (
    <div className="tutorial-overlay">
      {/* Highlight overlay */}
      {highlightBounds && (
        <>
          {/* Blurred backdrop with cutout */}
          <div 
            className="tutorial-backdrop-with-cutout"
            style={{
              clipPath: `polygon(
                0% 0%, 
                0% 100%, 
                ${highlightBounds.left - 8}px 100%, 
                ${highlightBounds.left - 8}px ${highlightBounds.top - 8}px, 
                ${highlightBounds.right + 8}px ${highlightBounds.top - 8}px, 
                ${highlightBounds.right + 8}px ${highlightBounds.bottom + 8}px, 
                ${highlightBounds.left - 8}px ${highlightBounds.bottom + 8}px, 
                ${highlightBounds.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            }}
          ></div>
          {/* Glowing border around clear area */}
          <div 
            className="tutorial-spotlight" 
            style={{
              left: highlightBounds.left - 8,
              top: highlightBounds.top - 8,
              width: highlightBounds.width + 16,
              height: highlightBounds.height + 16,
            }}
          ></div>
        </>
      )}
      
      {/* Arrow pointing to highlighted element */}
      {arrowPosition && currentStep.arrow && (
        <div 
          className="tutorial-arrow"
          style={{
            left: arrowPosition.x - 16,
            top: arrowPosition.y - 16,
          }}
        >
          {currentStep.arrow === 'top' && <FaArrowDown />}
          {currentStep.arrow === 'bottom' && <FaArrowUp />}
          {currentStep.arrow === 'left' && <FaArrowRight />}
          {currentStep.arrow === 'right' && <FaMousePointer />}
        </div>
      )}

      {/* Tutorial step card */}
      <motion.div 
        className="tutorial-step-card"
        style={getCardPosition(currentStep.position, highlightBounds, isMobile)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="tutorial-step-header">
          <h3>{currentStep.title}</h3>
          <button className="tutorial-close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        
        <div className="tutorial-step-content">
          <p>{currentStep.content}</p>
        </div>

        <div className="tutorial-step-footer">
          <div className="tutorial-progress">
            <span>{step + 1} of {tutorialSteps.length}</span>
            <div className="tutorial-progress-bar">
              <div 
                className="tutorial-progress-fill" 
                style={{ width: `${((step + 1) / tutorialSteps.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="tutorial-step-buttons">
            {!isFirstStep && (
              <button onClick={onPrev} className="tutorial-btn tutorial-btn-secondary">
                Previous
              </button>
            )}
            
            {isLastStep ? (
              <button onClick={onClose} className="tutorial-btn tutorial-btn-primary">
                Start Playing! 🚀
              </button>
            ) : (
              <button onClick={onNext} className="tutorial-btn tutorial-btn-primary">
                Next <FaArrowRight />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
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
  const [gameOverReason, setGameOverReason] = useState<'win' | 'bankruptcy' | null>(null);
  const [moneySquares, setMoneySquares] = useState<MoneySquare[]>([]);
  const [gameNumber, setGameNumber] = useState(1);
  const [turnNumber, setTurnNumber] = useState(1);
  const [isChatFullScreen, setIsChatFullScreen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(!isMobile);
  const [tutorialStep, setTutorialStep] = useState(0);
  
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
    
    // Use different dice ranges based on board size
    const maxDiceValue = isMobile ? 4 : 6; // Mobile: 1-4, Desktop: 1-6
    const winPosition = totalSquares - 1; // Last square index (8 for mobile, 15 for desktop)
    
    // Simulate dice rolling animation
    const rollAnimation = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * maxDiceValue) + 1);
    }, 100);
    
    setTimeout(() => {
      clearInterval(rollAnimation);
      const finalRoll = Math.floor(Math.random() * maxDiceValue) + 1;
      setDiceResult(finalRoll);
      setIsRolling(false);
      addSystemMessage(`${players[currentPlayerId].name} rolled a ${finalRoll} (dice)`);

      setPlayers(prevPlayers => {
          const currentPlayer = prevPlayers[currentPlayerId];
          const newPosition = Math.min(currentPlayer.piecePosition + finalRoll, winPosition);
          
          addSystemMessage(`${currentPlayer.name} moved to position ${newPosition + 1}`);
          
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

          if (newPosition >= winPosition) {
              setIsGameOver(true);
              setGameOverReason('win');
              updatedPlayer.money += 20; // Winner prize
              addSystemMessage(`${currentPlayer.name} reached position ${totalSquares} and won the game! Earned $20 prize! (win) (party)`);
          }
          
          return {
              ...prevPlayers,
              [currentPlayerId]: updatedPlayer
          };
      });
    }, 1000);
  }, [currentPlayerId, players, isGameOver, isRolling, addSystemMessage, moneySquares, isMobile, totalSquares]);

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
    
    // Check if there's already an active trade offer FROM this player (only if it's been sent, not draft)
    if (tradeOffer && tradeOffer.fromPlayerId === currentPlayerId && tradeOffer.status === 'sent') {
      addSystemMessage("You already have an active trade offer!");
      return;
    }
    
    // Check if there's a pending trade offer that hasn't been responded to (from other player)
    if (tradeOffer && tradeOffer.status === 'sent' && tradeOffer.fromPlayerId !== currentPlayerId) {
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

  const handleCancelTrade = () => {
    // Clear the trade offer when canceling
    setTradeOffer(null);
    setShowTradeModal(false);
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
    setGameOverReason(null);
    setGameNumber(prev => prev + 1);
    setTurnNumber(1);
    setTradeOffer(null); // Clear any pending trades
    setShowTradeModal(false);
    addSystemMessage("New game started! Each player paid $25 entry fee. (party)");
  };

  const handleRestartFromBeginning = () => {
    // Reset everything to initial state
    setPlayers(INITIAL_PLAYERS);
    setCurrentPlayerId(1);
    setDiceResult(null);
    setIsGameOver(false);
    setGameOverReason(null);
    setGameNumber(1);
    setTurnNumber(1);
    setTradeOffer(null);
    setShowTradeModal(false);
    setMessages([]);
    addSystemMessage("Game restarted from the beginning! Both players start with $100. (party)");
  };

  // Tutorial handlers
  const handleTutorialNext = () => {
    if (tutorialStep < 9) {
      setTutorialStep(prev => prev + 1);
    }
  };

  const handleTutorialPrev = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => prev - 1);
    }
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    setTutorialStep(0);
  };

  // Check if any player has $0
  useEffect(() => {
    const player1 = players[1];
    const player2 = players[2];
    
    if (player1.money <= 0 && player2.money <= 0) {
      addSystemMessage("Both players are out of money! Game over! (sad)");
      setIsGameOver(true);
      setGameOverReason('bankruptcy');
    } else if (player1.money <= 0) {
      addSystemMessage(`${player1.name} is out of money! ${player2.name} wins the tournament! (win)`);
      setIsGameOver(true);
      setGameOverReason('bankruptcy');
    } else if (player2.money <= 0) {
      addSystemMessage(`${player2.name} is out of money! ${player1.name} wins the tournament! (win)`);
      setIsGameOver(true);
      setGameOverReason('bankruptcy');
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
          --border-radius: 16px;
          --shadow-sm: 0 4px 12px rgba(87, 185, 255, 0.15);
          --shadow-md: 0 8px 25px rgba(87, 185, 255, 0.2);
          --shadow-lg: 0 12px 40px rgba(87, 185, 255, 0.25);
          --gradient-primary: linear-gradient(135deg, var(--color-medium), var(--color-light));
          --gradient-secondary: linear-gradient(135deg, var(--color-dark), var(--color-text));
          --chat-height: 360px;
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
          overflow-x: hidden;
        }
        .main-container {
          display: grid;
          grid-template-columns: 280px 1fr 280px;
          grid-template-rows: 1fr var(--chat-height);
          grid-template-areas:
            "p1 board p2"
            "chat chat chat";
          height: 100vh;
          width: 100%;
          gap: 24px;
          padding: 24px;
          box-sizing: border-box;
          max-width: 1600px;
          margin: 0 auto;
        }
        .game-area {
          grid-area: board;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 20px;
        }
        .game-board {
          display: grid;
          width: 100%;
          max-width: 650px;
          aspect-ratio: 1 / 1;
          border: 5px solid var(--color-medium);
          background: linear-gradient(45deg, #ffffff 25%, #f0f8ff 25%, #f0f8ff 50%, #ffffff 50%, #ffffff 75%, #f0f8ff 75%, #f0f8ff);
          background-size: 30px 30px;
          position: relative;
          border-radius: var(--border-radius);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .game-board:hover {
          box-shadow: 0 15px 50px rgba(87, 185, 255, 0.3);
          transform: translateY(-2px);
        }
        .board-square {
          border: 2px solid var(--color-light);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          color: var(--color-dark);
          font-weight: bold;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(15px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 6px;
          position: relative;
          overflow: hidden;
        }
        .board-square::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(87, 185, 255, 0.2), transparent);
          transition: left 0.5s;
        }
        .board-square:hover {
          background: rgba(255,255,255,1);
          transform: scale(1.05);
          border-color: var(--color-medium);
          box-shadow: inset 0 0 15px rgba(87, 185, 255, 0.2);
        }
        .board-square:hover::before {
          left: 100%;
        }
        .game-piece {
          position: absolute;
          top: 0;
          left: 0;
          width: calc(100% / ${BOARD_DIMENSION} * 0.7);
          height: calc(100% / ${BOARD_DIMENSION} * 0.7);
          border-radius: 50%;
          margin: calc(100% / ${BOARD_DIMENSION} * 0.15);
          border: 3px solid white;
          box-shadow: var(--shadow-lg);
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        .game-piece:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        
        @media (max-width: 768px) {
          .game-piece {
            width: calc(100% / ${BOARD_DIMENSION} * 0.6);
            height: calc(100% / ${BOARD_DIMENSION} * 0.6);
            margin: calc(100% / ${BOARD_DIMENSION} * 0.2);
            border: 2px solid white;
          }
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
        
        @media (max-width: 768px) {
          .piece-label {
            font-size: calc(100% / ${BOARD_DIMENSION} * 0.4);
          }
        }
        .square-number {
          font-size: 0.95rem;
          margin-bottom: 6px;
          color: var(--color-medium);
          text-shadow: 0 1px 2px rgba(255,255,255,0.8);
          font-weight: 700;
        }
        .money-indicator {
          font-size: 0.75rem;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          color: #333;
          padding: 4px 8px;
          border-radius: 8px;
          font-weight: bold;
          box-shadow: 0 2px 8px rgba(255,215,0,0.4);
          animation: coinGlow 3s infinite;
          border: 2px solid #FFF;
          text-shadow: 0 1px 1px rgba(0,0,0,0.1);
          position: relative;
          overflow: hidden;
        }
        .money-indicator::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.6) 50%, transparent 70%);
          animation: shimmer 4s infinite;
        }
        @keyframes coinGlow {
          0%, 100% { 
            box-shadow: 0 2px 8px rgba(255,215,0,0.4);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 4px 20px rgba(255,215,0,0.8), 0 0 30px rgba(255,215,0,0.4);
            transform: scale(1.05);
          }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
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
          padding: 14px 28px;
          font-size: 1rem;
          font-weight: 600;
          border: none;
          border-radius: var(--border-radius);
          background: var(--gradient-primary);
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
          display: flex;
          align-items: center;
          gap: 10px;
          justify-content: center;
          position: relative;
          overflow: hidden;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          letter-spacing: 0.5px;
        }
        button:before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.6s;
        }
        button:hover:before {
          left: 100%;
        }
        button:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-lg);
          filter: brightness(1.1);
        }
        button:active {
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }
        button:disabled {
          background: linear-gradient(135deg, #bbb, #999);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
          opacity: 0.6;
        }
        button:disabled:before {
          display: none;
        }
        .player-panel {
          grid-area: p1;
          padding: 24px;
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          border-radius: var(--border-radius);
          border: 3px solid var(--color-text);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: visible;
        }
        .player-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(87, 185, 255, 0.03), rgba(144, 213, 255, 0.03));
          pointer-events: none;
          border-radius: var(--border-radius);
        }
        .player-panel.p2 {
          grid-area: p2;
        }
        .player-panel.active {
          transform: translateY(-10px);
          box-shadow: var(--shadow-lg);
          border-color: var(--color-medium) !important;
          background: rgba(255,255,255,1);
        }
        .player-panel.active::before {
          background: linear-gradient(135deg, rgba(87, 185, 255, 0.08), rgba(144, 213, 255, 0.08));
        }
        .player-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          position: relative;
          min-height: 48px;
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
          position: absolute;
          top: 0;
          right: 0;
          color: #4CAF50;
          font-size: 1.2rem;
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
          overflow: visible;
        }
        .trade-button.pending-trade {
          background: linear-gradient(135deg, #ff6b6b, #ff8e53);
          animation: pulseGlow 2s infinite;
        }
        .trade-notification {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4757;
          color: white;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          animation: bounce 1s infinite;
          z-index: 10;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
          background: rgba(255,255,255,0.98);
          backdrop-filter: blur(20px);
          border-radius: var(--border-radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          border: 3px solid var(--color-text);
          height: var(--chat-height);
          min-height: var(--chat-height);
          max-height: var(--chat-height);
          box-shadow: var(--shadow-lg);
          position: relative;
          overflow: hidden;
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
        .emoji-toggle, .fullscreen-toggle {
          padding: 8px;
          font-size: 1.1rem;
          min-width: auto;
        }
        
        .chat-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          z-index: 1000 !important;
          grid-area: unset !important;
          border-radius: 0 !important;
        }
        
        .chat-fullscreen .chat-body {
          height: calc(100vh - 160px) !important;
        }
        
        .floating-chat-button {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: var(--gradient-primary);
          color: white;
          border: none;
          box-shadow: var(--shadow-lg);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          cursor: pointer;
          transition: all 0.3s ease;
          padding-left: 0px;
          padding-right: 0px;
        }
        .floating-chat-button:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 25px rgba(87, 185, 255, 0.4);
        }
        .floating-chat-button .notification-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #ff4757;
          color: white;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: bold;
          z-index: 10;
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
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
          flex: 1;
          overflow-y: auto;
          margin-bottom: 16px;
          padding-right: 12px;
          scrollbar-width: thin;
          scrollbar-color: var(--color-medium) transparent;
          min-height: 0;
          height: calc(var(--chat-height) - 120px);
        }
        .chat-body::-webkit-scrollbar {
          width: 8px;
        }
        .chat-body::-webkit-scrollbar-track {
          background: rgba(var(--color-light), 0.3);
          border-radius: 4px;
        }
        .chat-body::-webkit-scrollbar-thumb {
          background: var(--color-medium);
          border-radius: 4px;
          transition: background 0.3s ease;
        }
        .chat-body::-webkit-scrollbar-thumb:hover {
          background: var(--color-dark);
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
          gap: 2px;
        }
        .chat-form input {
          flex-grow: 1;
          padding: 12px 16px;
          border: 2px solid var(--color-light);
          border-radius: var(--border-radius);
          outline: none;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.9);
        }
        .chat-form input:focus {
          border-color: var(--color-medium);
          box-shadow: 0 0 0 3px rgba(87, 185, 255, 0.1);
        }
        .chat-form button {
          border-radius: var(--border-radius);
          padding: 12px 16px;
          min-width: 50px;
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
          display: flex;
          flex-direction: column;
          align-items: center;
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
        
                 /* Restart button specific styles */
         button[style*="linear-gradient(135deg, #ff6b6b, #ff8e53)"] {
           border: none !important;
           box-shadow: 0 4px 15px rgba(255, 107, 107, 0.3) !important;
         }
         button[style*="linear-gradient(135deg, #ff6b6b, #ff8e53)"]:hover {
           box-shadow: 0 6px 20px rgba(255, 107, 107, 0.4) !important;
           background: linear-gradient(135deg, #ff5252, #ff7043) !important;
         }

         /* Interactive Tutorial Styles */
         .tutorial-overlay {
           position: fixed;
           top: 0;
           left: 0;
           right: 0;
           bottom: 0;
           z-index: 1500;
           pointer-events: none;
         }

         .tutorial-backdrop-with-cutout {
           position: fixed;
           top: 0;
           left: 0;
           right: 0;
           bottom: 0;
           background: rgba(0, 0, 0, 0.7);
           backdrop-filter: blur(3px);
           pointer-events: none;
           z-index: 1501;
         }

         .tutorial-spotlight {
           position: fixed;
           border: 3px solid #57B9FF;
           border-radius: 12px;
           box-shadow: 0 0 0 4px rgba(87, 185, 255, 0.3), 0 0 20px rgba(87, 185, 255, 0.5);
           animation: tutorialPulse 2s infinite;
           pointer-events: none;
           z-index: 1502;
           background: transparent;
         }

         @keyframes tutorialPulse {
           0%, 100% { 
             box-shadow: 0 0 0 4px rgba(87, 185, 255, 0.3), 0 0 20px rgba(87, 185, 255, 0.5);
             transform: scale(1);
           }
           50% { 
             box-shadow: 0 0 0 8px rgba(87, 185, 255, 0.2), 0 0 30px rgba(87, 185, 255, 0.7);
             transform: scale(1.02);
           }
         }

         .tutorial-arrow {
           position: fixed;
           font-size: 2rem;
           color: #57B9FF;
           z-index: 1503;
           animation: tutorialBounce 1.5s infinite;
           pointer-events: none;
           text-shadow: 0 0 10px rgba(87, 185, 255, 0.8);
           width: 32px;
           height: 32px;
           display: flex;
           align-items: center;
           justify-content: center;
         }

         @keyframes tutorialBounce {
           0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
           40% { transform: translateY(-10px); }
           60% { transform: translateY(-5px); }
         }

         .tutorial-step-card {
           background: rgba(255, 255, 255, 0.98);
           backdrop-filter: blur(20px);
           border-radius: 20px;
           padding: 24px;
           max-width: 400px;
           box-shadow: var(--shadow-lg);
           border: 2px solid var(--color-medium);
           pointer-events: all;
           z-index: 1504;
         }

         .tutorial-step-header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           margin-bottom: 16px;
           padding-bottom: 12px;
           border-bottom: 2px solid var(--color-light);
         }

         .tutorial-step-header h3 {
           margin: 0;
           color: var(--color-dark);
           font-size: 1.3rem;
           font-weight: 600;
         }

         .tutorial-close-btn {
           background: transparent;
           border: none;
           color: var(--color-text);
           font-size: 1.2rem;
           cursor: pointer;
           padding: 4px;
           border-radius: 50%;
           transition: all 0.3s ease;
         }

         .tutorial-close-btn:hover {
           background: rgba(var(--color-light), 0.3);
           color: var(--color-dark);
           transform: scale(1.1);
         }

         .tutorial-step-content p {
           margin: 0;
           color: var(--color-text);
           line-height: 1.6;
           font-size: 1rem;
         }

         .tutorial-step-footer {
           margin-top: 20px;
         }

         .tutorial-progress {
           display: flex;
           align-items: center;
           gap: 12px;
           margin-bottom: 16px;
         }

         .tutorial-progress span {
           color: var(--color-text);
           font-size: 0.9rem;
           font-weight: 600;
           min-width: 70px;
         }

         .tutorial-progress-bar {
           flex: 1;
           height: 6px;
           background: rgba(var(--color-light), 0.3);
           border-radius: 3px;
           overflow: hidden;
         }

         .tutorial-progress-fill {
           height: 100%;
           background: var(--gradient-primary);
           border-radius: 3px;
           transition: width 0.5s ease;
         }

         .tutorial-step-buttons {
           display: flex;
           gap: 12px;
           justify-content: flex-end;
         }

         .tutorial-btn {
           padding: 10px 20px;
           border: none;
           border-radius: 12px;
           font-weight: 600;
           cursor: pointer;
           transition: all 0.3s ease;
           display: flex;
           align-items: center;
           gap: 8px;
         }

         .tutorial-btn-primary {
           background: var(--gradient-primary);
           color: white;
         }

         .tutorial-btn-primary:hover {
           transform: translateY(-2px);
           box-shadow: var(--shadow-md);
         }

         .tutorial-btn-secondary {
           background: rgba(var(--color-light), 0.3);
           color: var(--color-dark);
         }

         .tutorial-btn-secondary:hover {
           background: rgba(var(--color-light), 0.5);
           transform: translateY(-1px);
         }

        /* MOBILE LAYOUT */
        @media (max-width: 768px) {
          :root {
            --chat-height: 140px;
          }
          .main-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto 1fr;
            grid-template-areas:
              "panels"
              "board";
            height: 100vh;
            padding: 8px;
            gap: 8px;
            width: 100vw;
            max-width: 100vw;
            overflow-x: hidden;
          }
          .player-panels-container {
            grid-area: panels;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 4px;
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            overflow: visible;
            position: relative;
          }
          .player-panel { 
            flex: 1; 
            padding: 12px;
            text-align: center;
            min-height: auto;
            max-width: calc(50vw - 12px);
            box-sizing: border-box;
            overflow: visible;
          }
          .player-panel .player-header {
            flex-direction: column;
            gap: 8px;
            text-align: center;
            min-height: 60px;
            justify-content: center;
          }
          .player-panel .player-avatar {
            width: 40px;
            height: 40px;
            font-size: 1rem;
            margin: 0 auto;
          }
          .player-panel .player-info h3 {
            font-size: 1.1rem;
            margin: 4px 0;
          }
          .player-panel .player-status {
            font-size: 0.8rem;
          }
          .player-panel .player-stats {
            margin: 12px 0;
            padding: 8px;
          }
          .player-panel .stat-item {
            margin-bottom: 4px;
          }
          .player-panel .stat-label {
            font-size: 0.8rem;
          }
          .player-panel .stat-value {
            font-size: 1rem;
          }
          .player-panel .trade-button {
            padding: 8px 12px;
            font-size: 0.9rem;
            margin-top: 8px;
            overflow: visible;
            position: relative;
          }
          .player-panel .active-indicator {
            position: absolute;
            top: 4px;
            right: 4px;
            font-size: 1rem;
          }
          .player-panel .trade-notification {
            top: -6px;
            right: -6px;
            width: 18px;
            height: 18px;
            font-size: 10px;
          }
          .game-area {
            grid-area: board;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px;
            padding-bottom: 90px;
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
            overflow: hidden;
          }
          .game-board { 
            max-width: calc(100vw - 32px);
            width: calc(100vw - 32px);
            height: calc(100vw - 32px);
            max-height: calc(100vh - 240px);
            margin: 0 auto;
            box-sizing: border-box;
          }
          .chat-system { 
            height: var(--chat-height);
            min-height: var(--chat-height);
            max-height: var(--chat-height);
            padding: 12px;
            width: 100%;
            max-width: 100vw;
            box-sizing: border-box;
          }
          .chat-body {
            height: calc(var(--chat-height) - 100px);
            font-size: 0.85rem;
          }
          .controls {
            position: fixed;
            bottom: 10px;
            left: 8px;
            right: 8px;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(20px);
            padding: 10px;
            border-radius: 16px;
            box-shadow: var(--shadow-lg);
            z-index: 100;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 2px solid var(--color-light);
            box-sizing: border-box;
            width: calc(100vw - 16px);
            max-width: calc(100vw - 16px);
          }
          .controls button {
            flex: 1;
            margin: 0 4px;
            padding: 10px 8px;
            font-size: 0.8rem;
            white-space: nowrap;
            min-width: 0;
          }
          .modal-content {
            width: calc(100vw - 20px);
            max-width: 500px;
            padding: 16px;
            margin: 10px;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
          }
          .trade-players {
            flex-direction: column;
            gap: 16px;
          }
          .trade-arrow {
            transform: rotate(90deg);
            font-size: 1.5rem;
          }
          .modal-actions {
            flex-direction: column;
            gap: 12px;
          }
          .modal-actions button {
            width: 100%;
          }
        }
        
        @media (max-width: 480px) {
          .main-container {
            padding: 6px;
            gap: 6px;
          }
          .player-panels-container {
            gap: 6px;
          }
          .player-panel {
            padding: 8px;
          }
          .player-panel .player-avatar {
            width: 32px;
            height: 32px;
            font-size: 0.9rem;
          }
          .player-panel .player-info h3 {
            font-size: 1rem;
          }
          .player-panel .player-status {
            font-size: 0.75rem;
          }
          .game-board {
            width: calc(100vw - 24px);
            max-width: calc(100vw - 24px);
            height: calc(100vw - 24px);
            max-height: calc(100vh - 180px);
          }
          .controls {
            left: 6px;
            right: 6px;
            width: calc(100vw - 12px);
            max-width: calc(100vw - 12px);
            padding: 8px;
          }
          .controls button {
            padding: 8px 6px;
            font-size: 0.75rem;
          }
          .chat-system {
            padding: 10px;
          }
                     .modal-content {
             width: calc(100vw - 12px);
             padding: 12px;
             margin: 6px;
           }
         }
       `}</style>
      <div className="main-container" style={{ display: isMobile && isChatFullScreen ? 'none' : 'grid' }}>
        {isMobile ? (
          <div className="player-panels-container">
            <PlayerPanel 
              player={player1} 
              isCurrentPlayer={currentPlayerId === 1} 
              onTrade={handleInitiateTrade} 
              hasPendingTrade={tradeOffer?.fromPlayerId === 1 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 1 && tradeOffer?.status === 'sent' && currentPlayerId === 1}
              isGameOver={isGameOver}
            />
            <PlayerPanel 
              player={player2} 
              isCurrentPlayer={currentPlayerId === 2} 
              onTrade={handleInitiateTrade} 
              hasPendingTrade={tradeOffer?.fromPlayerId === 2 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 2 && tradeOffer?.status === 'sent' && currentPlayerId === 2}
              isGameOver={isGameOver}
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
              isGameOver={isGameOver}
            />
            <PlayerPanel 
              player={player2} 
              isCurrentPlayer={currentPlayerId === 2} 
              onTrade={handleInitiateTrade} 
              className="p2" 
              hasPendingTrade={tradeOffer?.fromPlayerId === 2 && tradeOffer?.status === 'sent'}
              hasIncomingTrade={tradeOffer?.toPlayerId === 2 && tradeOffer?.status === 'sent' && currentPlayerId === 2}
              isGameOver={isGameOver}
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
              style={{
                textAlign: "center", 
                color: CALM_BLUE_PALETTE.dark, 
                marginBottom: "8px",
                fontSize: "0.9rem",
                padding: "0 8px",
                lineHeight: "1.3"
              }}
              variants={fadeInUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              👆 Swipe up to roll!
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
                  {players[player1.piecePosition >= 8 ? 1: 2].name} Wins!
                </h2>
                <p style={{color: CALM_BLUE_PALETTE.text, margin: "8px 0"}}>🎉 Congratulations! 🎉</p>
                
                <div style={{display: "flex", gap: "12px", justifyContent: "center", marginTop: "16px"}}>
                  {gameOverReason === 'win' ? (
                    <motion.button
                      onClick={handleRematch}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaPlay /> Play Again ($25 each)
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleRestartFromBeginning}
                      style={{
                        background: "linear-gradient(135deg, #ff6b6b, #ff8e53)",
                        color: "white"
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      🔄 Restart from Beginning
                    </motion.button>
                  )}
                </div>
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

        {isMobile && !isChatFullScreen && (
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

        {!isMobile && (
          <ChatSystem 
            messages={messages} 
            onSendMessage={handleSendMessage}
            isFullScreen={false}
            onToggleFullScreen={() => setIsChatFullScreen(!isChatFullScreen)}
            isMobile={isMobile}
          />
        )}
      </div>
        
      {isMobile && !isChatFullScreen && (
        <motion.button
          className="floating-chat-button"
          onClick={() => setIsChatFullScreen(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <FaComments />
          {messages.length > 0 && (
            <span className="notification-badge">{messages.length}</span>
          )}
        </motion.button>
      )}

      {isMobile && isChatFullScreen && (
        <ChatSystem 
          messages={messages} 
          onSendMessage={handleSendMessage}
          isFullScreen={true}
          onToggleFullScreen={() => setIsChatFullScreen(!isChatFullScreen)}
          isMobile={isMobile}
        />
      )}

      {showTradeModal && (
        <TradeModal 
          offer={tradeOffer}
          players={players}
          currentPlayerId={currentPlayerId}
          onClose={() => setShowTradeModal(false)}
          onCancel={handleCancelTrade}
          onAccept={handleAcceptTrade}
          onDecline={handleDeclineTrade}
          onSendOffer={handleSendTradeOffer}
        />
      )}

      {showTutorial && (
        <InteractiveTutorial
          step={tutorialStep}
          onNext={handleTutorialNext}
          onPrev={handleTutorialPrev}
          onClose={handleTutorialClose}
          isMobile={isMobile}
          boardRef={boardRef}
          totalSquares={totalSquares}
        />
      )}
    </>
  );
};

export default App;