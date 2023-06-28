class checkers_player_00 extends( checkers_player ) {
  choose_move( board ) {
    const local_board = new checkers_board( board );
    const moves = local_board.player_moves( this.id );
    
    return Math.floor( Math.random() * moves.length );
    // return [ 0, moves.length-1 ][ Math.floor( Math.random() * 2 ) ];
  }
}
