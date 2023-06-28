class checkers_player_01 extends( checkers_player ) {
  choose_move( board, depth = 0 ) {
    const local_board = new checkers_board( board );
    let move_val = -12;
    let move_id = -1;

    const moves = local_board.player_moves( this.id );
    if ( moves.length > 0 ) {
      let value;
      for ( let mid = 0; mid < moves.length; mid++ ) {
        value = this.eval_move( moves[ mid ], structuredClone( board ), depth );
        if ( value > move_val ) {
          move_val = value;
          move_id  = mid;
        }
      }
    }

    return move_id;
  }

  eval_move( move, board, depth ) {
    let rtrn = 0;

    let tmp_board;
    const local_board = new checkers_board( board );
    local_board.move( move[0], move[1] );
    const enemy_moves = local_board.player_moves( this.enemy_id );
    if ( enemy_moves.length > 0 ) {
      let total = 0;
      for ( let mv = 0; mv < enemy_moves.length; mv++ ) {
        tmp_board = new checkers_board( structuredClone( local_board ) );
        tmp_board.move( mv[0], mv[1] );
        total += tmp_board.rel_scores( this.id );
      }
      rtrn = total / enemy_moves.length;
    }
    else {
      rtrn = local_board.count_checkers( this.id );
    }

    return rtrn;
  }
  
}
