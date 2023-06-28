class checkers_game {
  constructor( board = false ) {
    if ( board ) this.board = board;
    else this.board = new checkers_board;
    this.players = [ new checkers_player_00(0), new checkers_player_01(1) ];
  }
  
  start() {
    this.board.reset_board();
    this.turn_cnt = 0;
    const max_turns = 1000;
    while ( this.turn_cnt++ < max_turns  &&  this.board.game_is_alive() ) {
      this.next_turn();
      if ( this.turn_cnt % 100 == 0 )
        console.log( '%s turns completed', this.turn_cnt );
    }
    if ( this.turn_cnt >= max_turns ) {
      console.log( 'Max Turns Elapsed!  This game is a Draw' );
      this.board.end_game( I_Game_Draw );
    }
  }

  next_turn() {
    let rtrn = false;
    
    const player_id = this.board.get_player();
    const moves_list = this.board.player_moves( player_id );
    let move;
    if ( moves_list.length > 0 ) {
      const move_id = this.players[player_id].choose_move( structuredClone( this.board ) );
      move = moves_list[ move_id ];
      if ( ! ( move && ( rtrn = this.board.move( move[0], move[1] ) ) ) ) {
        console.log( 'Move Failed!' );
      }
    }
    else {
      this.board.next_player();
      this.board.end_game( "Player "+player_id+" can't move and has thus lost." );
    }
    console.log( 'Turn %s completed for Player %s: %o', this.turn_cnt, player_id, move );
    this.console_board();
    
    return rtrn;
  }

  console_board() {
    const output = [];
    const xy_board = this.board.xy_board();
    for ( let x = 0; x < 8; x++ ) {
      output[x] = [];
      for ( let y = 0; y < 8; y++ ) {
        if ( xy_board[y][x].valid )
          output[x][y] = "(" + xy_board[y][x].indx + ")  \t" + xy_board[y][x].strval;
        else
          output[x][y] = ' ';
      }
    }
    console.log( 'Current Player: %s', this.board.get_player() );
    console.table( output );
  }
}


class checkers_player {
  constructor( id, name='' ) {
    this.id = id;
    this.enemy_id = [1,0][id];
    this.name = name ? name : 'Player ' + id;
    this.tag = this.name[0] + '-' + id;
  }
}