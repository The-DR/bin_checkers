// Indexes for Peeks and Moves.
// Peeks & Moves are arrays with three elements; indexed as follows.
const IN_USE = ORIGIN = 0;
const PLAYER = TARGET = 1;
const KING   = JUMP   = 2;

// Status masks
// The Board Status is a single byte; masked as follows.
const ALIVE       = 1;  // significant bit 0 (2^0)
const CRNT_PLAYER = 2;  // significant bit 1 (2^1)
const DRAW_GAME   = 4;  // significant bit 2 (2^2)
const VICTOR      = 8;  // significant bit 3 (2^3)

const I_Game_Over     = 'Game Over';
const I_Game_Draw     = 'Game is a Draw';
const E_Invalid_Index = 'Invalid Index(es)';
const E_Wrong_Player  = 'Invalid Action for Current Player';

class checkers_board {  // Board Indexes: [0] = In Use flag (T/F), [1] = Player ID (0/1), [2] = King flag (T/F)
  constructor( new_board = null ) {
    this.status = new Uint8Array(1);  // a virtual array (js view) containing a single unsigned 8-bit (byte) INT used to track general board details.
    this.data = new Uint32Array(3);   // a virtual array (js view) containing three unsigned 32-bit (longword) INTs used to track IN_USE, PLAYER & KING attribures of a board location (indx).
    this.reset_board();
    if ( new_board !== null ) {
      this.data = structuredClone( new_board.data );
      this.status = structuredClone( new_board.status );
    }
  }

  reset_board() {
    this.data[IN_USE] = 0xFFF0_0FFF;  // In Use Flags: 1111 1111 1111 0000 0000 1111 1111 1111  (4293922815)
    this.data[PLAYER] = 0x0000_0FFF;  // Player IDs:   0000 0000 0000 0000 0000 1111 1111 1111  (4095)
    this.data[KING]   = 0x0000_0000;  // King Flags:   0000 0000 0000 0000 0000 0000 0000 0000  (0)
    this.reset_cache();
    this.reset_log();
    this.set_player( Math.floor( Math.random() * 2 ) );
    this.status[0] |= ALIVE;
  }

  reset_cache() {
    this.cache = { 'peeks': [] };
  }

  reset_log() {
    this.error_log = [];
  }

  log( event ) {
    this.error_log.push( event )
  }

  valid_index( indx, fnctn_name ) {
    let rtrn;

    if ( ! ( rtrn = ( indx >= 0 && indx < 32 ) ) )
      this.log( [ fnctn_name, E_Invalid_Index, indx ] );

    return rtrn;
  }

  data_for( indx ) {
    let indx_data = [];

    if ( this.valid_index( indx, 'data_for' ) ) {
      indx_data.push( Boolean( ( this.data[0] >> indx ) & 1 ) );
      indx_data.push( ( this.data[1] >> indx ) & 1 );
      indx_data.push( Boolean( ( this.data[2] >> indx ) & 1 ) );
    }

    return indx_data;
  }

  peek( indx ) {
    if ( this.cache.peeks[indx] == undefined )
      if ( this.valid_index( indx, 'peek' ) )
        this.cache.peeks[indx] = this.data_for( indx );
    return this.cache.peeks[indx];
  }

  poke( indx, newvals ) {
    let rtrn = false;

    if ( this.valid_index( indx, 'poke' ) ) {
      const mask = 1 << indx;
      try {
        for ( let i = 0; i < 3; i++ ) {
          if ( newvals[i] )
            this.data[i] |= mask;
          else
            this.data[i] &= ~mask;
          this.cache.peeks[indx] = newvals;
        }
        rtrn = true;
      }
      catch {
        delete this.cache.peeks[indx];
      }
    }

    return rtrn;
  }

  clear( indx ) {
    return this.poke( indx, [0,0,0] );
  }

  crown( indx ) {
    let rtrn = false;

    const peek = this.peek( indx );
    if ( peek && peek[IN_USE] && ! peek[KING]
      && this.xy_for( indx )[1] == [ 0, 7 ][ peek[PLAYER] ] ) {
        peek[KING] = true;
        rtrn = this.poke( indx, peek );
    }

    return rtrn;
  }

  get_player() {
    return ( this.status[0] & CRNT_PLAYER ) >> (CRNT_PLAYER-1);
  }

  set_player( player ) {
    if ( [ 0, 1 ].includes( player ) )
      this.status[0] |= ( player << (CRNT_PLAYER-1) );
    return this.get_player();
  }

  next_player() {
    this.status[0] ^= CRNT_PLAYER;
    return this.get_player();
  }

  move( origin_indx, target_indx ) {
    let rtrn = false;

    if ( this.status[0] & ALIVE ) {
      delete this.cache.checker_lists;
      delete this.cache.checker_counts;
      if ( this.valid_index( origin_indx, 'move/origin' ) && this.valid_index( target_indx, 'move/target' ) ) {
        const backup = structuredClone( this.board );
        const origin_peek = this.peek( origin_indx );
        if ( origin_peek ) {
          const checker_owner = origin_peek[PLAYER];
          const current_player = this.get_player();
          if ( current_player == checker_owner ) {
            const moves = this.valid_moves_for( origin_indx );
            for ( let indxs of moves ) {
              if ( indxs[1] == target_indx ) {
                if ( this.poke( target_indx, origin_peek ) ) {
                  if ( rtrn = this.clear( origin_indx ) ) {
                    this.crown( target_indx );
                    if ( indxs[JUMP] >= 0 ) {
                      if ( rtrn = this.clear( indxs[JUMP] ) ) {
                        if ( this.game_is_alive() ) {
                          const new_moves = this.valid_moves_for( target_indx );
                          if ( new_moves.length == 0 || new_moves[0][JUMP] == -1 )
                            this.next_player();
                        }
                      }
                    }
                    else
                      this.next_player();
                  }
                }
                break;
              }
            }
          }
          else this.log( [ 'move', E_Wrong_Player, 'Origin: '+origin_indx, 'Target: '+target_indx, 'Checker Owner: '+checker_owner, 'Current Player: '+current_player ] );
        }

        if ( ! rtrn ) {
          this.board = backup;
        }
      }
    }
    else this.log( [ 'move', I_Game_Over, origin_indx, target_indx ] );

    return rtrn;
  }

  indx_for( [ x, y ] ) {
    let rtrn = -1;
    if ( x >= 0 && x < 8 && y >= 0 && y < 8 && ( ( x + y ) % 2 ) )
      rtrn = ( ( x - ( ( y + 1 ) % 2 ) ) / 2 ) + ( y * 4 );
    return rtrn;
  }

  xy_for( indx ) {
    let x = -1, y = -1;

    if ( this.valid_index( indx, 'xy_for' ) ) {
      y = Math.floor( indx / 4 );
      x = ( ( indx - ( y * 4 ) ) * 2 ) + ( ( y + 1 ) % 2 );
    }

    return [ x, y ];
  }

  four_moves_for( indx ) {
    const moves = [ -1, -1, -1, -1 ];

    if ( this.valid_index( indx, 'four_moves_for' ) ) {
      const y = Math.floor( indx / 4 );
      const i = indx + ( ( y + 1 ) % 2 );
      const p = [
        [  0, 8, i-5, y-1 ],
        [  0, 8, i-4, y-1 ],
        [ -1, 7, i+3, y+1 ],
        [ -1, 7, i+4, y+1 ] ];

      for ( let drctn = 0; drctn < 4; drctn++ ) {
        moves[drctn] = (  y > p[drctn][0]  &&  y < p[drctn][1]  &&  p[drctn][2] >= 0  &&  Math.floor( p[drctn][2] / 4 ) == p[drctn][3]  )
                    ?  p[drctn][2]
                    :  -1;
      }
    }

    return moves;
  }

  jumps_for( root_indx ) {
  }

  moves_for( root_indx ) {
    const moves = [];

    if ( this.valid_index( root_indx, 'moves_for' ) ) {
      const root_peek = this.peek( root_indx );
      const player = root_peek[PLAYER];
      const min_max_drctn = root_peek[KING] ? [ 0, 3 ] : [ [ 0, 1 ], [ 2, 3 ] ][player];
      const four_moves = this.four_moves_for( root_indx );

      for ( let drctn = 0; drctn < 4; drctn++ ) {
        if ( drctn >= min_max_drctn[0] && drctn <= min_max_drctn[1] ) {
          let trgt_indx = four_moves[drctn];
          if ( trgt_indx >= 0 ) {
            const trgt_peek = this.peek( trgt_indx );
            if ( ! trgt_peek[IN_USE] ) {
              moves.push( [ root_indx, trgt_indx, -1 ] );
            }
            else if ( trgt_peek[PLAYER] != player ) {
              const jump_indx = trgt_indx;
              trgt_indx = this.four_moves_for( trgt_indx )[drctn];
              if ( trgt_indx >= 0 && ! this.peek( trgt_indx )[IN_USE] ) {
                moves.push( [ root_indx, trgt_indx, jump_indx ] );
              }
            }
          }
        }
      }
    }

    return moves;
  }

  valid_moves_for( indx ) {
    return this.validate_moves( this.moves_for( indx ) );
  }

  validate_moves( moves_list ) {
    const valid_moves = [ [], [] ];

    for ( let mv of moves_list ){
      valid_moves[ ( mv[JUMP] == -1 ) ? 0 : 1 ].push( mv );
    }

    return valid_moves[1].length > 0 ? valid_moves[1] : valid_moves[0];
  }

  list_checkers( player_id = -1 ) {
    if ( this.cache.checker_lists == undefined ) {
      this.cache.checker_lists = [ [], [] ];
      for ( let indx = 0; indx < 32; indx++ ) {
        let peek = this.data_for( indx );
        if ( peek && peek[IN_USE] )
          this.cache.checker_lists[ peek[PLAYER] ].push( indx );
      }
    }

    return player_id == -1 ? this.cache.checker_lists : this.cache.checker_lists[ player_id ];
  }

  count_checkers( player = -1 ) {
    if ( this.cache.checker_counts == undefined ) {
      const checkers = this.list_checkers();
      this.cache.checker_counts = [ checkers[0].length, checkers[1].length ];
    }
    return player == -1 ? this.cache.checker_counts : this.cache.checker_counts[ player ];
  }

  rel_scores( player = -1 ) {
    let scores = this.count_checkers();
    scores = [ scores[0] - scores[1], scores[1] - scores[0] ];
    return player == -1 ? scores : scores[ player ];
  }

  game_is_alive() {
    let game_is_alive = ( this.status[0] & ALIVE );

    if ( game_is_alive ) {
      const scores = this.count_checkers();
      if ( ! ( game_is_alive = ( scores[0] > 0 && scores[1] > 0 ) ) ) {
        const victor = scores[0] > 0 ? 0 : 1;
        this.set_player( victor );
        this.end_game( 'Victory for Player ' + victor );
      }
    }

    return game_is_alive;
  }

  end_game( reason = '' ) {
    this.status[0] &= ! ALIVE;
    if ( reason == I_Game_Draw )
      this.status[0] |= DRAW_GAME;
    this.log( [ 'EoG', I_Game_Over, reason ] );
  }

  player_moves( player = this.get_player() ) {
    const moves_list = [];

    const checkers = this.list_checkers( player );
    for ( let chckr_indx of checkers ) {
      let chckr_moves = this.moves_for( chckr_indx );
      if ( chckr_moves.length > 0 )
        moves_list.push( ...chckr_moves );
    }

    return this.validate_moves( moves_list );
  }

  indx_details( indx ) {
    return this.xy_details( this.xy_for( indx ) )
  }

  xy_details( [ x, y ] ) {
    const rtrn = {
      'Index': indx = this.indx_for( [ x, y ] ),
      'Location': [ x, y ],
      'Valid': false,
      'In_Use': false,
      'Owner': -1,
      'King': false
    }

    if ( indx >= 0 ) {
      rtrn['Valid'] = true;
      const data = this.data_for( indx );
      if ( rtrn['In_Use'] = Boolean( data[IN_USE] ) ) {
        rtrn['Owner'] = data[PLAYER];
        rtrn['King'] = Boolean( data[KING] );
      }
    }

    return rtrn;
  }

  xy_board() {
    const xy_board = [];

    for ( let x = 0; x < 8; x++ ) {
      xy_board[x] = [];
      for ( let y = 0; y < 8; y++ ) {
        xy_board[x][y] = { 'valid': false, strval: ' ' }
        if ( ( x + y ) % 2 ) {
          xy_board[x][y].valid = true;
          xy_board[x][y].xy = { 'X':x, 'Y':y };
          xy_board[x][y].indx = this.indx_for( [ x, y ] );
          xy_board[x][y].data = this.data_for( xy_board[x][y].indx );
          xy_board[x][y].strval = xy_board[x][y].data[IN_USE]
                                ? xy_board[x][y].data[PLAYER] + ( xy_board[x][y].data[KING] ? ' K' : '' )
                                : '     ';
        }
      }
    }

    return xy_board;
  }

}